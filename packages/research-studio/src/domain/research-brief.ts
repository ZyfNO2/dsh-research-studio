/** Pure Research Brief validation, Gate, diff, and Tutor rules. */

import { ResearchSkillId, StageId } from './types.ts'
import type {
  ArtifactFieldDiff,
  GateResult,
  ResearchJsonValue,
  ResearchBrief,
  ResearchBriefPatch,
  ResearchProjectId,
  TutorSuggestion,
} from './types.ts'

/** Empty Stage-0 authoring value used by the UI and Application layer. */
export const EMPTY_RESEARCH_BRIEF: ResearchBrief = {
  problemDomain: '', researchGoal: '', constraints: [], timeline: '',
  availableData: '', availableCode: '', compute: '', currentFoundation: '',
  initialDirection: '', unknowns: [],
}

const REQUIRED_TEXT_FIELDS = [
  'problemDomain', 'researchGoal', 'timeline', 'availableData', 'availableCode',
  'compute', 'currentFoundation', 'initialDirection',
] as const

/**
 * Canonicalize a partially supplied brief at the Host boundary.
 * @param input - partial Brief fields.
 * @returns normalized Brief.
 */
export function normalizeResearchBrief(input: ResearchBriefPatch): ResearchBrief {
  return {
    problemDomain: cleanText(input.problemDomain),
    researchGoal: cleanText(input.researchGoal),
    constraints: cleanList(input.constraints),
    timeline: cleanText(input.timeline),
    availableData: cleanText(input.availableData),
    availableCode: cleanText(input.availableCode),
    compute: cleanText(input.compute),
    currentFoundation: cleanText(input.currentFoundation),
    initialDirection: cleanText(input.initialDirection),
    unknowns: cleanList(input.unknowns),
  }
}

/**
 * Deterministically evaluate the Phase-2 BRIEF_READY contract.
 * @param brief - normalized Brief.
 * @returns Gate result.
 */
export function evaluateBriefReady(brief: ResearchBrief): GateResult {
  const missing: string[] = REQUIRED_TEXT_FIELDS.filter(field => brief[field].length === 0)
  if (brief.constraints.length === 0) missing.push('constraints')
  if (brief.unknowns.length === 0) missing.push('unknowns')
  if (missing.length > 0) {
    return {
      status: 'fail',
      reasons: missing.map(field => `brief-ready.missing.${field}`),
      missing,
      recommendedBackflow: [StageId('research-brief')],
    }
  }
  return {
    status: 'pass',
    reasons: ['brief-ready.complete', 'brief-ready.resources-bounded', 'brief-ready.unknowns-explicit'],
    missing: [],
    recommendedBackflow: [],
  }
}

/**
 * Compare two immutable artifact payloads at their top-level fields.
 * @param before - earlier payload.
 * @param after - later payload.
 * @returns changed fields.
 */
export function diffArtifactContent(
  before: Readonly<Record<string, ResearchJsonValue>>,
  after: Readonly<Record<string, ResearchJsonValue>>,
): readonly ArtifactFieldDiff[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .sort()
    .filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map(field => ({ field, before: before[field], after: after[field] }))
}

/**
 * Build a deterministic Socratic review without fabricating academic content.
 * @param id - suggestion identifier.
 * @param projectId - project identifier.
 * @param artifactId - exact optional Brief head.
 * @param brief - normalized Brief.
 * @returns bounded suggestion.
 */
export function createTutorSuggestion(
  id: string,
  projectId: ResearchProjectId,
  artifactId: TutorSuggestion['basedOnBriefArtifactId'],
  brief: ResearchBrief,
): TutorSuggestion {
  const gate = evaluateBriefReady(brief)
  const questions = gate.missing.slice(0, 3).map(field => `tutor.question.${field}`)
  const unknownCandidates = gate.missing
    .filter(field => field !== 'unknowns')
    .map(field => `[unknown:${field}]`)
  return {
    id,
    projectId,
    basedOnBriefArtifactId: artifactId,
    questions: questions.length > 0 ? questions : ['tutor.question.refine'],
    proposedPatch: unknownCandidates.length === 0
      ? {}
      : { unknowns: cleanList([...brief.unknowns, ...unknownCandidates]) },
    skillIds: [
      ResearchSkillId('research-planning'), ResearchSkillId('problem-formulation'),
      ResearchSkillId('scope-definition'), ResearchSkillId('feasibility-check'),
    ],
  }
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean))]
}
