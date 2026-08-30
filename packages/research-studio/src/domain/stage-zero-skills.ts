/** Stage-0 research method metadata, independent from DSH Skill runtime types. */

import { ResearchSkillId } from './types.ts'
import type { ResearchSkillDefinition } from './types.ts'
import type { SkillRegistry } from './registries.ts'

/** The four fixed Phase-2 method skills. */
export const STAGE_ZERO_SKILLS: readonly ResearchSkillDefinition[] = [
  { id: ResearchSkillId('research-planning'), version: '1.0.0', mission: 'Plan a bounded research route from the current brief.' },
  { id: ResearchSkillId('problem-formulation'), version: '1.0.0', mission: 'Turn a broad topic into an explicit research problem and goal.' },
  { id: ResearchSkillId('scope-definition'), version: '1.0.0', mission: 'Make constraints, timeline, data, code, and compute boundaries explicit.' },
  { id: ResearchSkillId('feasibility-check'), version: '1.0.0', mission: 'Expose unresolved assumptions and feasibility gaps without inventing evidence.' },
]

/**
 * Register the fixed method metadata and return an aggregate disposer.
 * @param skills - target skill registry.
 * @returns aggregate disposer.
 */
export function registerStageZeroSkills(skills: SkillRegistry): () => void {
  const disposers = STAGE_ZERO_SKILLS.map(skill => skills.register(skill))
  return () => { for (const dispose of disposers.reverse()) dispose() }
}
