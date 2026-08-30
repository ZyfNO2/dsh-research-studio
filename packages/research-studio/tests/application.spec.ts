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
})

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
