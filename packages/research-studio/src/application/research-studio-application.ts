/** Phase-2 Research Studio use cases over pure domain contracts and persistence ports. */

import {
  ArtifactId,
  createTutorSuggestion,
  diffArtifactContent,
  EMPTY_RESEARCH_BRIEF,
  evaluateEvidenceReady,
  evaluateBaselineFrozen,
  evaluateDesignFrozen,
  evaluateBriefReady,
  MVPResearchPreset,
  normalizeResearchBrief,
  normalizeEvidenceCard,
  normalizePaperCard,
  ResearchProjectId,
  StageId,
} from '../domain/index.ts'
import type {
  ArtifactFieldDiff,
  ArtifactRecord,
  ArtifactStore,
  EvidenceCard,
  EvidenceProjection,
  BaselineCard,
  BaselineFreeze,
  BaselineProjection,
  ClaimDraft,
  CompatibilityRecord,
  DesignFreeze,
  DesignProjection,
  EntityRegistry,
  GateEvaluationRecord,
  ResearchBriefPatch,
  PaperCard,
  ModuleCard,
  ResearchJsonValue,
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
const PAPER_TYPE = 'paper-card'
const EVIDENCE_TYPE = 'evidence-card'
const EVIDENCE_GATE_TYPE = 'evidence-gate-evaluation'
const BASELINE_TYPE = 'baseline-card'
const BASELINE_FREEZE_TYPE = 'baseline-freeze'
const MODULE_TYPE = 'module-card'
const COMPATIBILITY_TYPE = 'compatibility-record'
const CLAIM_TYPE = 'claim-draft'
const DESIGN_FREEZE_TYPE = 'design-freeze'
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
    const evidence = project === undefined ? emptyEvidence() : this.evidenceProjection(project.id)
    const baseline = project === undefined ? emptyBaseline() : this.baselineProjection(project.id)
    const design = project === undefined ? emptyDesign() : this.designProjection(project.id, baseline)
    const evidenceUnlocked = gate?.result.status === 'pass'
    const designUnlocked = evidenceUnlocked && evidence.gate?.status === 'pass'
    const buildSpecUnlocked = designUnlocked && design.gate?.status === 'pass'
    const projectedProject = project === undefined ? null : {
      ...project,
      currentStageId: project.currentStageId ?? (evidenceUnlocked ? EVIDENCE_STAGE : BRIEF_STAGE),
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
      evidence,
      baseline,
      design,
      unlockedStageIds: buildSpecUnlocked
        ? [BRIEF_STAGE, EVIDENCE_STAGE, StageId('research-design'), StageId('build-spec')]
        : designUnlocked ? [BRIEF_STAGE, EVIDENCE_STAGE, StageId('research-design')]
          : evidenceUnlocked ? [BRIEF_STAGE, EVIDENCE_STAGE] : [BRIEF_STAGE],
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

  /** Persist one immutable PaperCard revision after the Brief has opened Evidence. */
  savePaperCard(projectId: ResearchProjectId, input: PaperCard): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireEvidenceStage(projectId)
      const card = normalizePaperCard(input)
      if (card.id.trim() === '' || card.title === '' || card.provenance.url === '' || card.provenance.locator === '') {
        throw appError('invalid-paper-card', 'PaperCard requires id, title, and a locatable primary source')
      }
      await this.putEvidenceArtifact(project, PAPER_TYPE, card.id, card)
      return this.snapshot()
    })
  }

  /** Persist one immutable EvidenceCard revision; cards cannot point at an absent PaperCard. */
  saveEvidenceCard(projectId: ResearchProjectId, input: EvidenceCard): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireEvidenceStage(projectId)
      const card = normalizeEvidenceCard(input)
      if (card.id.trim() === '' || card.paperId.trim() === '' || card.statement === '') {
        throw appError('invalid-evidence-card', 'EvidenceCard requires id, paperId, and a source statement')
      }
      if (!this.evidenceProjection(projectId).papers.some(paper => paper.id === card.paperId)) {
        throw appError('evidence-paper-not-found', 'EvidenceCard must reference a PaperCard in the same project', { paperId: card.paperId })
      }
      await this.putEvidenceArtifact(project, EVIDENCE_TYPE, card.id, card)
      return this.snapshot()
    })
  }

  /** Persist a deterministic EVIDENCE_READY evaluation and unlock Research Design only on pass. */
  evaluateEvidenceReady(projectId: ResearchProjectId): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireEvidenceStage(projectId)
      const evidence = this.evidenceProjection(projectId)
      const result = evaluateEvidenceReady(evidence.papers, evidence.cards)
      const now = this.now()
      await this.options.artifacts.put({
        id: ArtifactId(`evidence-gate-${this.id()}`), projectId, type: EVIDENCE_GATE_TYPE, version: '1.0.0', origin: 'user',
        content: { result: result as unknown as Record<string, never> }, lifecycle: result.status === 'pass' ? 'accepted' : 'rejected',
        revision: 1, createdAt: now, updatedAt: now,
      })
      await this.options.projects.put({ ...project, currentStageId: result.status === 'pass' ? StageId('research-design') : EVIDENCE_STAGE, updatedAt: now })
      return this.snapshot()
    })
  }

  /** Persist an immutable baseline candidate; a revision invalidates any earlier freeze. */
  saveBaselineCard(projectId: ResearchProjectId, card: BaselineCard): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireEvidenceStage(projectId)
      if (card.id.trim() === '' || card.title.trim() === '') throw appError('invalid-baseline-card', 'BaselineCard requires id and title')
      await this.putEvidenceArtifact(project, BASELINE_TYPE, card.id, card, StageId('research-design'))
      return this.snapshot()
    })
  }

  /** Record the single active, traceable freeze decision for a candidate baseline. */
  freezeBaseline(projectId: ResearchProjectId, freeze: BaselineFreeze): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      this.requireEvidenceStage(projectId)
      const projection = this.baselineProjection(projectId)
      const baseline = projection.cards.find(card => card.id === freeze.baselineId)
      const result = evaluateBaselineFrozen(baseline, freeze)
      if (result.status !== 'pass') throw appError('baseline-freeze-rejected', 'Baseline cannot be frozen until its reproducibility context is complete', { missing: result.missing })
      const now = this.now()
      await this.options.artifacts.put({ id: ArtifactId(`baseline-freeze-${this.id()}`), projectId, type: BASELINE_FREEZE_TYPE, version: '1.0.0', origin: 'user', content: { freeze: freeze as unknown as ResearchJsonValue }, lifecycle: 'accepted', revision: 1, createdAt: now, updatedAt: now })
      return this.snapshot()
    })
  }

  /** Persist one attributed Module candidate without prescribing an implementation. */
  saveModuleCard(projectId: ResearchProjectId, card: ModuleCard): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireDesignStage(projectId)
      if (card.id.trim() === '' || card.proposedRole.trim() === '') throw appError('invalid-module-card', 'ModuleCard requires id and proposed role')
      await this.putDesignArtifact(project, MODULE_TYPE, card.id, card)
      return this.snapshot()
    })
  }

  /** Persist one explicit compatibility assessment for a design boundary. */
  saveCompatibility(projectId: ResearchProjectId, record: CompatibilityRecord): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireDesignStage(projectId)
      if (record.id.trim() === '') throw appError('invalid-compatibility-record', 'CompatibilityRecord requires id')
      await this.putDesignArtifact(project, COMPATIBILITY_TYPE, record.id, record)
      return this.snapshot()
    })
  }

  /** Persist the current falsifiable Claim draft; it is never an experimental result. */
  saveClaimDraft(projectId: ResearchProjectId, claim: ClaimDraft): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireDesignStage(projectId)
      if (claim.id.trim() === '') throw appError('invalid-claim-draft', 'ClaimDraft requires id')
      await this.putDesignArtifact(project, CLAIM_TYPE, claim.id, claim)
      return this.snapshot()
    })
  }

  /** Evaluate and persist a Design freeze only when the auditable graph is complete. */
  freezeDesign(projectId: ResearchProjectId, freeze: DesignFreeze): Promise<ResearchStudioSnapshot> {
    return this.mutate(async () => {
      const project = this.requireDesignStage(projectId)
      const design = this.designProjection(projectId, this.baselineProjection(projectId))
      const result = evaluateDesignFrozen({
        baselineFreeze: this.baselineProjection(projectId).freeze, modules: design.modules,
        compatibilities: design.compatibilities, claim: design.claim, freeze,
      })
      if (result.status !== 'pass') throw appError('design-freeze-rejected', 'Research Design cannot be frozen until its contracts and claim are complete', { missing: result.missing })
      const now = this.now()
      await this.options.artifacts.put({
        id: ArtifactId(`design-freeze-${this.id()}`), projectId, type: DESIGN_FREEZE_TYPE, version: '1.0.0', origin: 'user',
        content: { freeze: freeze as unknown as ResearchJsonValue }, lifecycle: 'accepted', revision: 1, createdAt: now, updatedAt: now,
      })
      await this.options.projects.put({ ...project, currentStageId: StageId('build-spec'), updatedAt: now })
      return this.snapshot()
    })
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

  private evidenceProjection(projectId: ResearchProjectId): EvidenceProjection {
    const artifacts = this.options.artifacts.list(projectId)
    const latest = (type: string) => {
      const byCard = new Map<string, ArtifactRecord>()
      for (const artifact of artifacts.filter(item => item.type === type)) {
        const card = artifact.content.card as { id?: unknown } | undefined
        if (typeof card?.id !== 'string') continue
        const prior = byCard.get(card.id)
        if (prior === undefined || (prior.revision ?? 0) < (artifact.revision ?? 0)) byCard.set(card.id, artifact)
      }
      return [...byCard.values()].map(item => item.content.card).filter(Boolean)
    }
    const gateArtifact = artifacts.filter(item => item.type === EVIDENCE_GATE_TYPE)
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).at(-1)
    const latestEvidenceChange = artifacts.filter(item => item.type === PAPER_TYPE || item.type === EVIDENCE_TYPE)
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).at(-1)
    const gate = latestEvidenceChange !== undefined && gateArtifact !== undefined
      && latestEvidenceChange.updatedAt > gateArtifact.updatedAt
      ? undefined
      : gateArtifact?.content.result as GateEvaluationRecord['result'] | undefined
    return {
      papers: latest(PAPER_TYPE) as unknown as PaperCard[],
      cards: latest(EVIDENCE_TYPE) as unknown as EvidenceCard[],
      gate: gate ?? null,
    }
  }

  private baselineProjection(projectId: ResearchProjectId): BaselineProjection {
    const artifacts = this.options.artifacts.list(projectId)
    const byCard = new Map<string, ArtifactRecord>()
    for (const artifact of artifacts.filter(item => item.type === BASELINE_TYPE)) {
      const card = artifact.content.card as { id?: unknown } | undefined
      if (typeof card?.id !== 'string') continue
      const prior = byCard.get(card.id)
      if (prior === undefined || isNewerRevision(artifact, prior)) byCard.set(card.id, artifact)
    }
    const cards = [...byCard.values()].map(item => item.content.card as unknown as BaselineCard)
    const freezeArtifact = artifacts.filter(item => item.type === BASELINE_FREEZE_TYPE)
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).at(-1)
    const freeze = freezeArtifact?.content.freeze as unknown as BaselineFreeze | undefined
    const selectedArtifact = freeze === undefined ? undefined : byCard.get(freeze.baselineId)
    // A candidate revision is a material change: the decision record remains auditable,
    // but it is no longer the active freeze until re-evaluated and saved again.
    const active = freeze !== undefined && selectedArtifact !== undefined && freezeArtifact !== undefined
      && selectedArtifact.updatedAt <= freezeArtifact.updatedAt
    return {
      cards,
      freeze: active ? freeze : null,
      gate: active ? evaluateBaselineFrozen(selectedArtifact.content.card as unknown as BaselineCard, freeze) : null,
    }
  }

  private designProjection(projectId: ResearchProjectId, baseline: BaselineProjection): DesignProjection {
    const artifacts = this.options.artifacts.list(projectId)
    const latest = <T>(type: string): T[] => {
      const byId = new Map<string, ArtifactRecord>()
      for (const artifact of artifacts.filter(item => item.type === type)) {
        const value = artifact.content.card as { id?: unknown } | undefined
        if (typeof value?.id !== 'string') continue
        const prior = byId.get(value.id)
        if (prior === undefined || isNewerRevision(artifact, prior)) byId.set(value.id, artifact)
      }
      return [...byId.values()].map(item => item.content.card as unknown as T)
    }
    const modules = latest<ModuleCard>(MODULE_TYPE)
    const compatibilities = latest<CompatibilityRecord>(COMPATIBILITY_TYPE)
    const claims = latest<ClaimDraft>(CLAIM_TYPE)
    const claim = claims.sort((left, right) => left.id.localeCompare(right.id)).at(-1) ?? null
    const freezeArtifact = artifacts.filter(item => item.type === DESIGN_FREEZE_TYPE).sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).at(-1)
    const latestDesignChange = artifacts.filter(item => [MODULE_TYPE, COMPATIBILITY_TYPE, CLAIM_TYPE].includes(item.type)).sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).at(-1)
    const latestBaselineFreeze = artifacts.filter(item => item.type === BASELINE_FREEZE_TYPE).sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).at(-1)
    const active = freezeArtifact !== undefined && baseline.freeze !== null
      && (latestDesignChange === undefined || latestDesignChange.updatedAt <= freezeArtifact.updatedAt)
      && (latestBaselineFreeze === undefined || latestBaselineFreeze.updatedAt <= freezeArtifact.updatedAt)
    const freeze = active ? freezeArtifact.content.freeze as unknown as DesignFreeze : null
    return { modules, compatibilities, claim, freeze, gate: freeze === null ? null : evaluateDesignFrozen({ baselineFreeze: baseline.freeze, modules, compatibilities, claim, freeze }) }
  }

  private async putEvidenceArtifact<T extends PaperCard | EvidenceCard | BaselineCard>(
    project: ResearchProjectRecord, type: string, cardId: string, card: T, nextStage: StageId = EVIDENCE_STAGE,
  ): Promise<void> {
    const previous = this.options.artifacts.list(project.id).filter(item => item.type === type && (item.content.card as { id?: unknown })?.id === cardId)
      .sort((left, right) => (left.revision ?? 0) - (right.revision ?? 0)).at(-1)
    const now = this.now()
    await this.options.artifacts.put({
      id: ArtifactId(`${type}-${this.id()}`), projectId: project.id, type, version: '1.0.0', origin: 'user',
      content: { card: card as unknown as ResearchJsonValue },
      ...(previous === undefined ? {} : { parentId: previous.id }), revision: (previous?.revision ?? 0) + 1,
      lifecycle: 'candidate', createdAt: now, updatedAt: now,
    })
    await this.options.projects.put({ ...project, currentStageId: nextStage, updatedAt: now })
  }

  private async putDesignArtifact<T extends ModuleCard | CompatibilityRecord | ClaimDraft>(
    project: ResearchProjectRecord, type: string, id: string, card: T,
  ): Promise<void> {
    const previous = this.options.artifacts.list(project.id).filter(item => item.type === type && (item.content.card as { id?: unknown })?.id === id)
      .sort((left, right) => (left.revision ?? 0) - (right.revision ?? 0)).at(-1)
    const now = this.now()
    await this.options.artifacts.put({
      id: ArtifactId(`${type}-${this.id()}`), projectId: project.id, type, version: '1.0.0', origin: 'user',
      content: { card: card as unknown as ResearchJsonValue }, ...(previous === undefined ? {} : { parentId: previous.id }),
      revision: (previous?.revision ?? 0) + 1, lifecycle: 'candidate', createdAt: now, updatedAt: now,
    })
    await this.options.projects.put({ ...project, currentStageId: StageId('research-design'), updatedAt: now })
  }

  private requireEvidenceStage(projectId: ResearchProjectId): ResearchProjectRecord {
    const project = this.requireActiveProject(projectId)
    if (project.currentStageId !== EVIDENCE_STAGE && project.currentStageId !== StageId('research-design')) {
      throw appError('evidence-stage-locked', 'Pass BRIEF_READY before recording Evidence')
    }
    return project
  }

  private requireDesignStage(projectId: ResearchProjectId): ResearchProjectRecord {
    const project = this.requireActiveProject(projectId)
    if (project.currentStageId !== StageId('research-design') && project.currentStageId !== StageId('build-spec')) {
      throw appError('research-design-stage-locked', 'Pass EVIDENCE_READY before recording Research Design artifacts')
    }
    if (this.evidenceProjection(projectId).gate?.status !== 'pass') {
      throw appError('research-design-evidence-required', 'Research Design requires a current passing EVIDENCE_READY gate')
    }
    return project
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

function emptyEvidence(): EvidenceProjection {
  return { papers: [], cards: [], gate: null }
}

function emptyBaseline(): BaselineProjection { return { cards: [], freeze: null, gate: null } }
function emptyDesign(): DesignProjection { return { modules: [], compatibilities: [], claim: null, freeze: null, gate: null } }

function isNewerRevision(candidate: ArtifactRecord, prior: ArtifactRecord): boolean {
  return (candidate.revision ?? 0) > (prior.revision ?? 0)
    || ((candidate.revision ?? 0) === (prior.revision ?? 0)
      && (candidate.updatedAt > prior.updatedAt
        || (candidate.updatedAt === prior.updatedAt && String(candidate.id) > String(prior.id))))
}

function appError(code: string, message: string, details: Readonly<Record<string, unknown>> = {}) {
  return new ResearchStudioApplicationError(code, message, details)
}
