import { describe, expect, it } from 'vitest'
import {
  EntityRegistry,
  MVPResearchPreset,
  ResearchEntityId,
  ResearchProjectId,
  StageId,
  StageRegistry,
  WorkflowRegistry,
  registerMvpResearchPreset,
} from '../src/domain/index.ts'

describe('MVPResearchPreset', () => {
  it('registers an extensible six-stage preset and Research Design object types', () => {
    const stages = new StageRegistry()
    const workflows = new WorkflowRegistry()
    const dispose = registerMvpResearchPreset(stages, workflows)

    expect(workflows.get(MVPResearchPreset.id)?.stageIds).toHaveLength(6)
    expect(stages.get(StageId('research-design'))?.objectTypes.map(objectType => objectType.title)).toEqual([
      'Baseline', 'Module', 'Reference', 'Claim',
    ])

    dispose()
    expect(stages.list()).toEqual([])
    expect(workflows.list()).toEqual([])
  })

  it('keeps entity registration independent from stages and workflows', () => {
    const entities = new EntityRegistry()
    const projectId = ResearchProjectId('project-a')
    const dispose = entities.register({
      id: ResearchEntityId('baseline-a'),
      projectId,
      kind: 'baseline',
      title: 'Baseline A',
      summary: 'Reproduction target',
      lifecycle: 'candidate',
      epistemic: 'proposed',
      origin: 'user',
    })

    expect(entities.list(projectId)).toHaveLength(1)
    dispose()
    expect(entities.list(projectId)).toEqual([])
  })
})
