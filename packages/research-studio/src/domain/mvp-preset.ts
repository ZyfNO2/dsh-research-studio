/** Default six-stage Research Studio preset. */

import { ResearchSkillId, StageId, WorkflowPresetId } from './types.ts'
import type { StageDefinition, WorkflowPreset } from './types.ts'
import type { StageRegistry, WorkflowRegistry } from './registries.ts'

const EMPTY_REFS = [] as const

/** The six-stage default preset; consumers may register unrelated presets beside it. */
export const MVPResearchPreset: WorkflowPreset = {
  id: WorkflowPresetId('mvp-research'),
  version: '1.0.0',
  title: 'MVP Research',
  stageIds: [
    StageId('research-brief'),
    StageId('evidence'),
    StageId('research-design'),
    StageId('build-spec'),
    StageId('experiment'),
    StageId('paper-audit'),
  ],
}

/** Stage definitions installed by {@link MVPResearchPreset}. */
export const MVPResearchStages: readonly StageDefinition[] = [
  {
    id: StageId('research-brief'), version: '1.0.0', title: 'Research Brief', order: 0,
    objectTypes: EMPTY_REFS,
    skillIds: [
      ResearchSkillId('research-planning'),
      ResearchSkillId('problem-formulation'),
      ResearchSkillId('scope-definition'),
      ResearchSkillId('feasibility-check'),
    ],
    tools: EMPTY_REFS,
    gateIds: ['BRIEF_READY'],
  },
  {
    id: StageId('evidence'), version: '1.0.0', title: 'Evidence', order: 1,
    objectTypes: EMPTY_REFS, skillIds: EMPTY_REFS, tools: EMPTY_REFS, gateIds: EMPTY_REFS,
  },
  {
    id: StageId('research-design'), version: '1.0.0', title: 'Research Design', order: 2,
    objectTypes: [
      { id: 'baseline', title: 'Baseline' },
      { id: 'module', title: 'Module' },
      { id: 'reference', title: 'Reference' },
      { id: 'claim', title: 'Claim' },
    ],
    skillIds: EMPTY_REFS,
    tools: EMPTY_REFS,
    gateIds: EMPTY_REFS,
  },
  {
    id: StageId('build-spec'), version: '1.0.0', title: 'BuildSpec', order: 3,
    objectTypes: EMPTY_REFS, skillIds: EMPTY_REFS, tools: EMPTY_REFS, gateIds: EMPTY_REFS,
  },
  {
    id: StageId('experiment'), version: '1.0.0', title: 'Experiment', order: 4,
    objectTypes: EMPTY_REFS, skillIds: EMPTY_REFS, tools: EMPTY_REFS, gateIds: EMPTY_REFS,
  },
  {
    id: StageId('paper-audit'), version: '1.0.0', title: 'Paper & Audit', order: 5,
    objectTypes: EMPTY_REFS, skillIds: EMPTY_REFS, tools: EMPTY_REFS, gateIds: EMPTY_REFS,
  },
]

/**
 * Install the MVP stages and preset and return one aggregate disposer.
 * @param stages - target stage registry.
 * @param workflows - target workflow registry.
 * @returns aggregate disposer.
 */
export function registerMvpResearchPreset(
  stages: StageRegistry,
  workflows: WorkflowRegistry,
): () => void {
  const disposers = MVPResearchStages.map(stage => stages.register(stage))
  try {
    disposers.push(workflows.register(MVPResearchPreset))
  } catch (error) {
    for (const dispose of disposers.reverse()) dispose()
    throw error
  }
  return () => {
    for (const dispose of disposers.reverse()) dispose()
  }
}
