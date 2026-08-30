/** Phase-2 Research Studio use cases over pure domain contracts and persistence ports. */

import {
  ArtifactId,
  createTutorSuggestion,
  diffArtifactContent,
  EMPTY_RESEARCH_BRIEF,
  evaluateBriefReady,
  MVPResearchPreset,
  normalizeResearchBrief,
  ResearchProjectId,
  StageId,
} from '../domain/index.ts'
import type {
  ArtifactFieldDiff,
  ArtifactRecord,
  ArtifactStore,
  EntityRegistry,
  GateEvaluationRecord,
  ResearchBriefPatch,
  ResearchProjectRecord,
  ResearchProjectStore,
  ResearchStudioSnapshot,
  SkillRegistry,
  StageRegistry,
  TutorSuggestion,
  WorkflowPresetId,
  WorkflowRegistry,
} from '../domain/index.ts'
import { ResearchStudioApplicationError } from './error.ts'

const ACTIVE_PROJECT_MARKER = ArtifactId('research-studio.active-project')
const BRIEF_TYPE = 'research-brief'
const GATE_TYPE = 'gate-evaluation'
const BRIEF_STAGE = StageId('research-brief')
const EVIDENCE_STAGE = StageId('evidence')

/** Persistence, registry, clock, and identifier dependencies for the application boundary. */
export interface ResearchStudioApplicationOptions {
  readonly projects: ResearchProjectStore
  readonly artifacts: ArtifactStore
  readonly entities: EntityRegistry
  readonly workflows: WorkflowRegistry
  readonly stages: StageRegistry
  readonly skills: SkillRegistry
  readonly now?: () => string
  readonly id?: () => string
}

/** Serial Host-authoritative use-case boundary shared by Remote and tests. */
export class ResearchStudioApplication {
  private activeProjectId: ResearchProjectId | null = null
  private commandLane: Promise<void> = Promise.resolve()
  private readonly now: () => string
  private readonly id: () => string

  constructor(private readonly options: ResearchStudioApplicationOptions) {
    this.now = options.now ?? (() => new Date().toISOString())
    this.id = options.id ?? (() => globalThis.crypto.randomUUID())
  }

  /** Recover the durable active project marker with a deterministic fallback. */
  initialize(): void {
    const marker = this.options.artifacts.get(ACTIVE_PROJECT_MARKER)
    const markerId = marker?.content.activeProjectId
    const marked = typeof markerId === 'string'
      ? this.options.projects.get(ResearchProjectId(markerId))
      : undefined
    this.activeProjectId = marked !== undefined && marked.archivedAt === undefined
      ? marked.id
      : this.pickFallback()?.id ?? null
  }

  /**
   * Return the complete Host projection; stage unlocks require a matching Gate and project progress.
   * @returns current projection.
   */
  snapshot(): ResearchStudioSnapshot {
    const preset = this.requirePreset(MVPResearchPreset.id)
    const stages = preset.stageIds.map(id => this.requireStage(id))
    const projects = this.sortedProjects()
    const storedProject = this.activeProjectId === null ? undefined : this.options.projects.get(this.activeProjectId)
    const project = storedProject?.archivedAt === undefined ? storedProject : undefined
    const brief = project === undefined ? undefined : this.latestBrief(project.id)
    const gate = project === undefined || brief === undefined ? undefined : this.latestGate(project.id, brief.id)
    const evidenceUnlocked = project?.currentStageId === EVIDENCE_STAGE && gate?.result.status === 'pass'
    const projectedProject = project === undefined ? null : {
      ...project,
      currentStageId: evidenceUnlocked ? EVIDENCE_STAGE : BRIEF_STAGE,
    }
    return {
      runtime: 'host',
      projects,
      project: projectedProject,
      preset,
      stages,
      entities: project === undefined ? [] : this.options.entities.list(project.id),
      brief: brief === undefined ? null : {
        artifact: brief,
        value: normalizeResearchBrief(brief.content),
      },
      briefHistory: project === undefined ? [] : this.briefHistory(project.id),
      gate: gate?.result ?? null,
      unlockedStageIds: evidenceUnlocked ? [BRIEF_STAGE, EVIDENCE_STAGE] : [BRIEF_STAGE],
    }
  }

  /**
   * Create and select one Phase-2 project.
   * @param title - project title.
   * @param workflowPresetId - supported preset id.
   * @returns updated projection.
   */
  createProject(title: string, workflowPresetId: WorkflowPresetId = MVPResearchPreset.id): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const cleanTitle = requireText(title, 'title')
      if (workflowPresetId !== MVPResearchPreset.id) {
        throw appError('unsupported-preset', 'Phase 2 supports only the MVP Research preset', { workflowPresetId })
      }
      this.requirePreset(workflowPresetId)
      const now = this.now()
      const project: ResearchProjectRecord = {
        id: ResearchProjectId(`project-${this.id()}`), title: cleanTitle, workflowPresetId,
        origin: 'user', createdAt: now, updatedAt: now, currentStageId: BRIEF_STAGE,
      }
      await this.options.projects.put(project)
      await this.selectProjectInternal(project.id)
      return this.snapshot()
    })
  }

  /**
   * Select one active project.
   * @param projectId - project identifier.
   * @returns updated projection.
   */
  selectProject(projectId: ResearchProjectId): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      this.requireActiveProject(projectId)
      await this.selectProjectInternal(projectId)
      return this.snapshot()
    })
  }

  /**
   * Rename one active project.
   * @param projectId - project identifier.
   * @param title - replacement title.
   * @returns updated projection.
   */
  renameProject(projectId: ResearchProjectId, title: string): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireActiveProject(projectId)
      await this.options.projects.put({ ...project, title: requireText(title, 'title'), updatedAt: this.now() })
      return this.snapshot()
    })
  }

  /**
   * Archive one active project and select a fallback.
   * @param projectId - project identifier.
   * @returns updated projection.
   */
  archiveProject(projectId: ResearchProjectId): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireActiveProject(projectId)
      await this.options.projects.put({ ...project, archivedAt: this.now(), updatedAt: this.now() })
      if (this.activeProjectId === projectId) {
        const fallback = this.pickFallback(projectId)
        if (fallback === undefined) {
          await this.options.artifacts.delete(ACTIVE_PROJECT_MARKER)
          this.activeProjectId = null
        } else {
          await this.selectProjectInternal(fallback.id)
        }
      }
      return this.snapshot()
    })
  }

  /**
   * Save an immutable candidate Brief revision.
   * @param projectId - project identifier.
   * @param expectedBriefArtifactId - expected head.
   * @param patch - Brief fields to merge.
   * @returns updated projection.
   */
  updateBrief(
    projectId: ResearchProjectId,
    expectedBriefArtifactId: ArtifactId | null,
    patch: ResearchBriefPatch,
  ): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireActiveProject(projectId)
      const previous = this.assertBriefHead(projectId, expectedBriefArtifactId)
      const base = previous === undefined
        ? EMPTY_RESEARCH_BRIEF
        : normalizeResearchBrief(previous.content)
      const brief = normalizeResearchBrief({ ...base, ...patch })
      const now = this.now()
      const artifact: ArtifactRecord = {
        id: ArtifactId(`brief-${this.id()}`), projectId, type: BRIEF_TYPE, version: '1.0.0',
        origin: 'user', content: { ...brief }, createdAt: now, updatedAt: now,
        ...(previous === undefined ? {} : { parentId: previous.id }),
        revision: (previous?.revision ?? 0) + 1, lifecycle: 'candidate',
      }
      await this.options.artifacts.put(artifact)
      await this.options.projects.put({ ...project, currentStageId: BRIEF_STAGE, updatedAt: now })
      return this.snapshot()
    })
  }

  /**
   * Evaluate the exact candidate head and persist its lifecycle transition.
   * @param projectId - project identifier.
   * @param expectedBriefArtifactId - exact candidate head.
   * @returns updated projection.
   */
  evaluateBriefReady(
    projectId: ResearchProjectId,
    expectedBriefArtifactId: ArtifactId,
  ): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireActiveProject(projectId)
      const brief = this.assertBriefHead(projectId, expectedBriefArtifactId)
      if (brief === undefined) throw appError('brief-required', 'Research Brief must be saved before evaluation')
      if (brief.lifecycle !== 'candidate') {
        if (this.latestGate(projectId, brief.id) !== undefined) return this.snapshot()
        throw appError('invalid-brief-lifecycle', 'Only a candidate Research Brief can be evaluated', {
          briefArtifactId: brief.id,
          lifecycle: brief.lifecycle,
        })
      }
      const result = evaluateBriefReady(normalizeResearchBrief(brief.content))
      const now = this.now()
      const evaluatedBrief: ArtifactRecord = {
        ...brief,
        id: ArtifactId(`brief-${this.id()}`),
        parentId: brief.id,
        revision: (brief.revision ?? 0) + 1,
        lifecycle: result.status === 'pass' ? 'accepted' : 'rejected',
        createdAt: now,
        updatedAt: now,
      }
      await this.options.artifacts.put(evaluatedBrief)
      const evaluation: GateEvaluationRecord = {
        gateId: 'BRIEF_READY', briefArtifactId: evaluatedBrief.id, result, evaluatedAt: now,
      }
      await this.options.artifacts.put({
        id: ArtifactId(`gate-${this.id()}`), projectId, type: GATE_TYPE, version: '1.0.0',
        origin: 'user',
        content: {
          gateId: evaluation.gateId,
          briefArtifactId: evaluation.briefArtifactId,
          result: {
            status: result.status,
            reasons: [...result.reasons],
            missing: [...result.missing],
            recommendedBackflow: [...result.recommendedBackflow],
          },
          evaluatedAt: evaluation.evaluatedAt,
        },
        lifecycle: result.status === 'pass' ? 'accepted' : 'rejected',
        revision: 1, createdAt: now, updatedAt: now,
      })
      await this.options.projects.put({
        ...project,
        currentStageId: result.status === 'pass' ? EVIDENCE_STAGE : BRIEF_STAGE,
        updatedAt: now,
      })
      return this.snapshot()
    })
  }

  /**
   * Produce a deterministic non-mutating Tutor proposal.
   * @param projectId - project identifier.
   * @param expectedBriefArtifactId - expected optional Brief head.
   * @returns bounded suggestion.
   */
  suggestBriefTutor(
    projectId: ResearchProjectId,
    expectedBriefArtifactId: ArtifactId | null,
  ): TutorSuggestion {
    this.requireActiveProject(projectId)
    const brief = this.assertBriefHead(projectId, expectedBriefArtifactId)
    return createTutorSuggestion(
      `tutor-${this.id()}`, projectId, brief?.id ?? null,
      brief === undefined ? EMPTY_RESEARCH_BRIEF : normalizeResearchBrief(brief.content),
    )
  }

  /**
   * Compare two revisions from the same Brief lineage.
   * @param beforeId - earlier revision id.
   * @param afterId - later revision id.
   * @returns changed top-level fields.
   */
  diffBriefRevisions(beforeId: ArtifactId, afterId: ArtifactId): readonly ArtifactFieldDiff[] {
    const before = this.options.artifacts.get(beforeId)
    const after = this.options.artifacts.get(afterId)
    if (before?.type !== BRIEF_TYPE || after?.type !== BRIEF_TYPE || before.projectId !== after.projectId) {
      throw appError('invalid-brief-lineage', 'Brief revisions must exist in the same project')
    }
    return diffArtifactContent(before.content, after.content)
  }

  private assertBriefHead(projectId: ResearchProjectId, expected: ArtifactId | null): ArtifactRecord | undefined {
    const latest = this.latestBrief(projectId)
    if ((latest?.id ?? null) !== expected) {
      throw appError('stale-brief', 'Research Brief changed; refresh before saving', {
        expectedBriefArtifactId: expected, actualBriefArtifactId: latest?.id ?? null,
      })
    }
    return latest
  }

  private latestBrief(projectId: ResearchProjectId): ArtifactRecord | undefined {
    return this.briefHistory(projectId).at(-1)
  }

  private briefHistory(projectId: ResearchProjectId): readonly ArtifactRecord[] {
    return this.options.artifacts.list(projectId)
      .filter(artifact => artifact.type === BRIEF_TYPE)
      .sort((left, right) => (left.revision ?? 0) - (right.revision ?? 0)
        || left.updatedAt.localeCompare(right.updatedAt) || String(left.id).localeCompare(String(right.id)))
  }

  private latestGate(projectId: ResearchProjectId, briefId: ArtifactId): GateEvaluationRecord | undefined {
    return this.options.artifacts.list(projectId)
      .filter(artifact => artifact.type === GATE_TYPE && artifact.content.briefArtifactId === briefId)
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
      .at(-1)?.content as unknown as GateEvaluationRecord | undefined
  }

  private sortedProjects(): readonly ResearchProjectRecord[] {
    return [...this.options.projects.list()].sort((left, right) =>
      Number(left.archivedAt !== undefined) - Number(right.archivedAt !== undefined)
      || right.updatedAt.localeCompare(left.updatedAt) || String(left.id).localeCompare(String(right.id)))
  }

  private pickFallback(exclude?: ResearchProjectId): ResearchProjectRecord | undefined {
    return this.sortedProjects().find(project => project.archivedAt === undefined && project.id !== exclude)
  }

  private requireActiveProject(projectId: ResearchProjectId): ResearchProjectRecord {
    const project = this.options.projects.get(projectId)
    if (project === undefined) throw appError('project-not-found', 'Research project does not exist', { projectId })
    if (project.archivedAt !== undefined) throw appError('project-archived', 'Research project is archived', { projectId })
    return project
  }

  private requirePreset(id: WorkflowPresetId) {
    const preset = this.options.workflows.get(id)
    if (preset === undefined) throw appError('preset-not-found', 'Workflow preset does not exist', { workflowPresetId: id })
    return preset
  }

  private requireStage(id: StageId) {
    const stage = this.options.stages.get(id)
    if (stage === undefined) throw new Error(`workflow preset references unknown stage "${id}"`)
    return stage
  }

  private async selectProjectInternal(projectId: ResearchProjectId): Promise<void> {
    const now = this.now()
    await this.options.artifacts.put({
      id: ACTIVE_PROJECT_MARKER, projectId, type: 'research-studio-state', version: '1.0.0',
      origin: 'user', content: { activeProjectId: projectId }, updatedAt: now, createdAt: now,
      revision: 1, lifecycle: 'accepted',
    })
    this.activeProjectId = projectId
  }

  private mutate<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.commandLane.then(operation, operation)
    this.commandLane = result.then(() => {}, () => {})
    return result
  }
}

function requireText(value: string, field: string): string {
  const clean = value.trim()
  if (clean.length === 0) throw appError('invalid-input', `${field} must not be blank`, { field })
  return clean
}

function appError(code: string, message: string, details: Readonly<Record<string, unknown>> = {}) {
  return new ResearchStudioApplicationError(code, message, details)
}
