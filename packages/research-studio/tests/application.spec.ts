import { describe, expect, it } from 'vitest'
import {
  EntityRegistry,
  MVPResearchPreset,
  ResearchStudioApplication,
  SkillRegistry,
  StageRegistry,
  WorkflowRegistry,
  registerMvpResearchPreset,
  registerStageZeroSkills,
} from '../src/index.ts'
import type {
  ArtifactRecord,
  ArtifactStore,
  ResearchBrief,
  ResearchProjectRecord,
  ResearchProjectId,
  ResearchProjectStore,
} from '../src/index.ts'

const completeBrief: ResearchBrief = {
  problemDomain: 'Efficient language-model adaptation',
  researchGoal: 'Reduce adaptation cost without degrading accuracy',
  constraints: ['One workstation', 'Four weeks'],
  timeline: 'Four weeks',
  availableData: 'A labelled public benchmark',
  availableCode: 'The existing baseline repository',
  compute: 'One 24 GB GPU',
  currentFoundation: 'A reproduced baseline',
  initialDirection: 'Parameter-efficient adaptation',
  unknowns: ['The best adapter rank is unknown'],
}

describe('ResearchStudioApplication', () => {
  it('versions Brief edits, rejects stale writers, gates the exact head, and relocks Evidence', async () => {
    const fixture = createFixture()
    const created = await fixture.application.createProject('Adapter study', MVPResearchPreset.id)
    const projectId = created.project!.id

    const first = await fixture.application.updateBrief(projectId, null, { problemDomain: 'Efficient adaptation' })
    const firstId = first.brief!.artifact.id
    const second = await fixture.application.updateBrief(projectId, firstId, completeBrief)
    const secondId = second.brief!.artifact.id

    expect(second.brief!.artifact).toMatchObject({ parentId: firstId, revision: 2, lifecycle: 'candidate' })
    expect(fixture.application.diffBriefRevisions(firstId, secondId).map(item => item.field)).toContain('researchGoal')
    await expect(fixture.application.updateBrief(projectId, firstId, { researchGoal: 'stale' }))
      .rejects.toMatchObject({ code: 'stale-brief' })

    const passed = await fixture.application.evaluateBriefReady(projectId, secondId)
    expect(passed.gate).toMatchObject({ status: 'pass', missing: [] })
    expect(passed.unlockedStageIds).toEqual(['research-brief', 'evidence'])
    expect(passed.brief!.artifact).toMatchObject({ parentId: secondId, revision: 3, lifecycle: 'accepted' })

    const edited = await fixture.application.updateBrief(projectId, passed.brief!.artifact.id, { researchGoal: '' })
    expect(edited.gate).toBeNull()
    expect(edited.unlockedStageIds).toEqual(['research-brief'])
    expect(edited.project?.currentStageId).toBe('research-brief')

    const failed = await fixture.application.evaluateBriefReady(projectId, edited.brief!.artifact.id)
    expect(failed.gate?.status).toBe('fail')
    expect(failed.gate?.missing).toContain('researchGoal')
    expect(failed.gate?.reasons).toContain('brief-ready.missing.researchGoal')
    expect(failed.brief!.artifact).toMatchObject({ parentId: edited.brief!.artifact.id, lifecycle: 'rejected' })
  })

  it('rejects workflow presets outside the Phase-2 execution boundary', async () => {
    const fixture = createFixture()
    await expect(fixture.application.createProject('Future workflow', 'future-preset' as typeof MVPResearchPreset.id))
      .rejects.toMatchObject({ code: 'unsupported-preset' })
  })

  it('persists active selection, chooses a fallback on archive, and restores from the marker', async () => {
    const fixture = createFixture()
    const first = await fixture.application.createProject('First', MVPResearchPreset.id)
    const firstId = first.project!.id
    const second = await fixture.application.createProject('Second', MVPResearchPreset.id)
    const secondId = second.project!.id
    await fixture.application.selectProject(firstId)

    const restarted = fixture.restart()
    expect(restarted.snapshot().project?.id).toBe(firstId)

    const archived = await restarted.archiveProject(firstId)
    expect(archived.project?.id).toBe(secondId)
    expect(archived.projects.find(project => project.id === firstId)?.archivedAt).toBeTruthy()
    const none = await restarted.archiveProject(secondId)
    expect(none.project).toBeNull()
  })

  it('returns a bounded Tutor proposal based on the exact Brief head', async () => {
    const fixture = createFixture()
    const created = await fixture.application.createProject('Tutor study', MVPResearchPreset.id)
    const projectId = created.project!.id
    const saved = await fixture.application.updateBrief(projectId, null, { problemDomain: 'Graph learning' })
    const head = saved.brief!.artifact.id
    const suggestion = fixture.application.suggestBriefTutor(projectId, head)

    expect(suggestion.basedOnBriefArtifactId).toBe(head)
    expect(suggestion.questions.length).toBeGreaterThanOrEqual(1)
    expect(suggestion.questions.length).toBeLessThanOrEqual(3)
    expect(suggestion.skillIds).toHaveLength(4)
    expect(suggestion.proposedPatch.unknowns?.every(item => item.startsWith('[unknown:'))).toBe(true)
    expect(fixture.artifacts.list(projectId).filter(item => item.type === 'research-brief')).toHaveLength(1)
  })

  it('persists evidence revisions and unlocks Research Design only after verified coverage', async () => {
    const fixture = createFixture()
    const created = await fixture.application.createProject('Evidence study', MVPResearchPreset.id)
    const projectId = created.project!.id
    const saved = await fixture.application.updateBrief(projectId, null, completeBrief)
    await fixture.application.evaluateBriefReady(projectId, saved.brief!.artifact.id)

    const paper = {
      id: 'paper-primary', title: 'Primary source', authors: ['Author'], identifiers: {}, sourceKind: 'paper' as const,
      provenance: { url: 'https://example.test/paper', locator: 'p. 1' }, verification: 'verified' as const,
    }
    await fixture.application.savePaperCard(projectId, paper)
    for (const target of ['brief.problemDomain', 'brief.constraints', 'baseline.candidate'] as const) {
      await fixture.application.saveEvidenceCard(projectId, {
        id: `evidence-${target}`, paperId: paper.id, locator: { url: paper.provenance.url, locator: 'sec. 2' },
        statement: `Primary-source fact for ${target}`, polarity: 'context', supports: [target], verification: 'verified',
      })
    }
    const passed = await fixture.application.evaluateEvidenceReady(projectId)
    expect(passed.evidence).toMatchObject({ gate: { status: 'pass' } })
    expect(passed.unlockedStageIds).toEqual(['research-brief', 'evidence', 'research-design'])

    const revised = await fixture.application.savePaperCard(projectId, { ...paper, title: 'Primary source revised' })
    expect(revised.evidence.gate).toBeNull()
    expect(revised.unlockedStageIds).toEqual(['research-brief', 'evidence'])
    expect(revised.evidence.papers).toHaveLength(1)
    expect(revised.evidence.papers[0]?.title).toBe('Primary source revised')
  })

  it('freezes a complete baseline and invalidates that decision on a candidate revision', async () => {
    const fixture = createFixture()
    const created = await fixture.application.createProject('Baseline study', MVPResearchPreset.id)
    const projectId = created.project!.id
    await unlockDesign(fixture.application, projectId)

    const baseline = {
      id: 'baseline-primary', title: 'Documented primary baseline', paperIds: [],
      repository: { url: 'https://example.test/baseline', commit: 'abc123', license: 'Apache-2.0' },
      task: 'Benchmark retrieval', datasetSplit: 'public validation split', reproduction: 'planned' as const,
      knownDeviations: [], evidenceIds: [],
    }
    await fixture.application.saveBaselineCard(projectId, baseline)
    const frozen = await fixture.application.freezeBaseline(projectId, {
      baselineId: baseline.id, rationale: 'Reference configuration is complete', acceptedDeviationIds: [],
      frozenBy: 'reviewer', frozenAt: '2026-08-30T00:00:00.000Z',
    })
    expect(frozen.baseline).toMatchObject({ freeze: { baselineId: baseline.id }, gate: { status: 'pass' } })

    const revised = await fixture.application.saveBaselineCard(projectId, { ...baseline, title: 'Revised primary baseline' })
    expect(revised.baseline.freeze).toBeNull()
    expect(revised.baseline.gate).toBeNull()
    expect(revised.baseline.cards).toMatchObject([{ id: baseline.id, title: 'Revised primary baseline' }])
  })

  it('freezes an auditable design and relocks Build Spec when a Module revision changes it', async () => {
    const fixture = createFixture()
    const created = await fixture.application.createProject('Design study', MVPResearchPreset.id)
    const projectId = created.project!.id
    await unlockDesign(fixture.application, projectId)
    const baseline = { id: 'baseline-design', title: 'Reference baseline', paperIds: [], repository: { url: 'https://example.test/base', commit: 'abc123', license: 'Apache-2.0' }, task: 'Retrieval', datasetSplit: 'public validation', reproduction: 'planned' as const, knownDeviations: [], evidenceIds: [] }
    await fixture.application.saveBaselineCard(projectId, baseline)
    await fixture.application.freezeBaseline(projectId, { baselineId: baseline.id, rationale: 'Complete context', acceptedDeviationIds: [], frozenBy: 'reviewer', frozenAt: '2026-08-30T00:00:00.000Z' })
    const contract = { semanticUnit: 'token embedding', shape: '[B,T,D]', dtype: 'float32', scale: 'normalized', ordering: 'batch,time,channel', maskPolicy: 'padding preserved', gradientPolicy: 'adapter only' }
    const module = { id: 'module-design', source: { paperIds: ['paper-primary'], license: 'Apache-2.0' }, originalRole: 'adapter', proposedRole: 'retrieval adapter', addressesGap: 'brief.problemDomain', input: contract, output: contract, optimization: { objective: 'ranking loss', schedule: 'fixed' }, predictedEffect: 'Predicted recall change under the stated condition.', competingExplanation: 'The split composition may explain any observed change.', failureModes: ['instability'], evidenceIds: ['evidence-brief.problemDomain'] }
    await fixture.application.saveModuleCard(projectId, module)
    await fixture.application.saveCompatibility(projectId, { id: 'edge-design', producer: `baseline:${baseline.id}`, consumer: `module:${module.id}`, contract, status: 'risk', requiredChecks: ['mask propagation'] })
    await fixture.application.saveClaimDraft(projectId, { id: 'claim-design', statement: 'Under the stated condition, the module is predicted to change recall within the latency guardrail.', condition: 'Public validation', mechanism: 'The adapter reweights features.', intervention: 'Insert after the encoder.', predictedMetric: { name: 'recall@10', direction: 'increase' as const, target: 'pre-registered comparison' }, guardrails: ['p95 latency threshold'], falsifier: 'The registered comparison does not meet the metric target.', evidenceIds: ['evidence-brief.problemDomain'], status: 'proposed' as const })
    const frozen = await fixture.application.freezeDesign(projectId, { rationale: 'Contracts reviewed', frozenBy: 'reviewer', frozenAt: '2026-08-30T00:02:00.000Z' })
    expect(frozen.design).toMatchObject({ gate: { status: 'pass' }, freeze: { frozenBy: 'reviewer' } })
    expect(frozen.unlockedStageIds).toContain('research-design')

    const revised = await fixture.application.saveModuleCard(projectId, { ...module, proposedRole: 'revised retrieval adapter' })
    expect(revised.design.freeze).toBeNull()
    expect(revised.design.gate).toBeNull()
  })
})

async function unlockDesign(application: ResearchStudioApplication, projectId: ResearchProjectId) {
  const saved = await application.updateBrief(projectId, null, completeBrief)
  await application.evaluateBriefReady(projectId, saved.brief!.artifact.id)
  const paper = { id: 'paper-primary', title: 'Primary source', authors: ['Author'], identifiers: {}, sourceKind: 'paper' as const, provenance: { url: 'https://example.test/paper', locator: 'p. 1' }, verification: 'verified' as const }
  await application.savePaperCard(projectId, paper)
  for (const target of ['brief.problemDomain', 'brief.constraints', 'baseline.candidate'] as const) {
    await application.saveEvidenceCard(projectId, { id: `evidence-${target}`, paperId: paper.id, locator: { url: paper.provenance.url, locator: 'sec. 2' }, statement: `Primary-source fact for ${target}`, polarity: 'context', supports: [target], verification: 'verified' })
  }
  await application.evaluateEvidenceReady(projectId)
}

function createFixture() {
  const projects = new MemoryProjectStore()
  const artifacts = new MemoryArtifactStore()
  const entities = new EntityRegistry()
  const workflows = new WorkflowRegistry()
  const stages = new StageRegistry()
  const skills = new SkillRegistry()
  registerMvpResearchPreset(stages, workflows)
  registerStageZeroSkills(skills)
  let sequence = 0
  const options = {
    projects, artifacts, entities, workflows, stages, skills,
    now: () => `2026-08-30T00:00:${String(sequence).padStart(2, '0')}.000Z`,
    id: () => String(++sequence),
  }
  const application = new ResearchStudioApplication(options)
  application.initialize()
  return {
    application, projects, artifacts,
    restart: () => {
      const next = new ResearchStudioApplication(options)
      next.initialize()
      return next
    },
  }
}

class MemoryProjectStore implements ResearchProjectStore {
  private readonly values = new Map<string, ResearchProjectRecord>()
  get(id: ResearchProjectRecord['id']) { return this.values.get(id) }
  list() { return [...this.values.values()] }
  async put(value: ResearchProjectRecord) { this.values.set(value.id, value) }
  async delete(id: ResearchProjectRecord['id']) { return this.values.delete(id) }
}

class MemoryArtifactStore implements ArtifactStore {
  private readonly values = new Map<string, ArtifactRecord>()
  get(id: ArtifactRecord['id']) { return this.values.get(id) }
  list(projectId?: ResearchProjectRecord['id']) {
    return [...this.values.values()].filter(value => projectId === undefined || value.projectId === projectId)
  }
  async put(value: ArtifactRecord) { this.values.set(value.id, value) }
  async delete(id: ArtifactRecord['id']) { return this.values.delete(id) }
}
