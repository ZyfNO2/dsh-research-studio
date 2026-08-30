/**
 * Product-owned Typert Remote contribution for an external DSH plugin.
 *
 * DSH's build-time generator currently recognizes protocol declarations only
 * when they live in its own workspace. This adapter keeps the generated
 * contract shape at the plugin boundary without modifying DSH Core: the
 * Client mounts these strict codecs, while the Host dispatches the decorated
 * controller through Typert's documented SRC compatibility path.
 */

import { z } from 'zod'
import type {
  InvocationDescriptor,
  RemoteResult,
  TypertRemoteContribution,
} from '@deepseek-ai/dsh-typert-protocol'
import type {
  ArchiveResearchProjectRequest,
  CreateResearchProjectRequest,
  EvaluateResearchBriefRequest,
  EvaluateEvidenceReadyRequest,
  RenameResearchProjectRequest,
  ResearchJsonValue,
  ResearchStudioSnapshot,
  SelectResearchProjectRequest,
  SuggestResearchBriefTutorRequest,
  SaveEvidenceCardRequest,
  SavePaperCardRequest,
  TutorSuggestion,
  UpdateResearchBriefRequest,
} from '../domain/types.ts'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespace$726573656172636853747564696f {
    snapshot: () => Promise<RemoteResult<ResearchStudioSnapshot>>
    createProject: (request: CreateResearchProjectRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    selectProject: (request: SelectResearchProjectRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    renameProject: (request: RenameResearchProjectRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    archiveProject: (request: ArchiveResearchProjectRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    updateBrief: (request: UpdateResearchBriefRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    evaluateBriefReady: (request: EvaluateResearchBriefRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    suggestBriefTutor: (request: SuggestResearchBriefTutorRequest) => Promise<RemoteResult<TutorSuggestion>>
    savePaperCard: (request: SavePaperCardRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    saveEvidenceCard: (request: SaveEvidenceCardRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    evaluateEvidenceReady: (request: EvaluateEvidenceReadyRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
  }
  interface TypertRemoteMap {
    'researchStudio/snapshot': () => Promise<RemoteResult<ResearchStudioSnapshot>>
    'researchStudio/createProject': (request: CreateResearchProjectRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    'researchStudio/selectProject': (request: SelectResearchProjectRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    'researchStudio/renameProject': (request: RenameResearchProjectRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    'researchStudio/archiveProject': (request: ArchiveResearchProjectRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    'researchStudio/updateBrief': (request: UpdateResearchBriefRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    'researchStudio/evaluateBriefReady': (request: EvaluateResearchBriefRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    'researchStudio/suggestBriefTutor': (request: SuggestResearchBriefTutorRequest) => Promise<RemoteResult<TutorSuggestion>>
    'researchStudio/savePaperCard': (request: SavePaperCardRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    'researchStudio/saveEvidenceCard': (request: SaveEvidenceCardRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
    'researchStudio/evaluateEvidenceReady': (request: EvaluateEvidenceReadyRequest) => Promise<RemoteResult<ResearchStudioSnapshot>>
  }
  interface TypertRemoteNamespaceMap {
    researchStudio: TypertRemoteNamespace$726573656172636853747564696f
  }
}

const stringId = z.string().min(1)
const dataOrigin = z.enum(['user', 'seed'])
const jsonValue: z.ZodType<ResearchJsonValue> = z.lazy(() => z.union([
  z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(z.string(), jsonValue),
]))
const artifact = z.object({
  id: stringId, projectId: stringId, type: z.string(), version: z.string(), origin: dataOrigin,
  content: z.record(z.string(), jsonValue), updatedAt: z.string(), parentId: stringId.optional(),
  revision: z.number().int().positive().optional(), lifecycle: z.enum(['draft', 'candidate', 'accepted', 'rejected']).optional(),
  createdAt: z.string().optional(),
})
const project = z.object({
  id: stringId, title: z.string(), workflowPresetId: stringId, origin: dataOrigin,
  createdAt: z.string(), updatedAt: z.string(), currentStageId: stringId.optional(), archivedAt: z.string().optional(),
})
const brief = z.object({
  problemDomain: z.string(), researchGoal: z.string(), constraints: z.array(z.string()), timeline: z.string(),
  availableData: z.string(), availableCode: z.string(), compute: z.string(), currentFoundation: z.string(),
  initialDirection: z.string(), unknowns: z.array(z.string()),
})
const briefPatch = brief.partial()
const gate = z.object({
  status: z.enum(['pass', 'pass-with-warnings', 'fail', 'blocked']), reasons: z.array(z.string()),
  missing: z.array(z.string()), recommendedBackflow: z.array(stringId),
})
const snapshot = z.object({
  runtime: z.literal('host'), projects: z.array(project), project: project.nullable(),
  preset: z.object({ id: stringId, version: z.string(), title: z.string(), stageIds: z.array(stringId) }),
  stages: z.array(z.object({
    id: stringId, version: z.string(), title: z.string(), order: z.number(),
    objectTypes: z.array(z.object({ id: z.string(), title: z.string() })), skillIds: z.array(stringId),
    tools: z.array(z.object({ id: z.string() })), gateIds: z.array(z.string()),
  })),
  entities: z.array(z.object({
    id: stringId, projectId: stringId, kind: z.string(), title: z.string(), summary: z.string(),
    lifecycle: z.enum(['draft', 'candidate', 'accepted', 'rejected', 'deprecated']),
    epistemic: z.enum(['unknown', 'proposed', 'inferred', 'verified', 'supported', 'refuted']), origin: dataOrigin,
  })),
  brief: z.object({ artifact, value: brief }).nullable(), briefHistory: z.array(artifact), gate: gate.nullable(),
  evidence: z.object({
    papers: z.array(z.object({ id: stringId, title: z.string(), authors: z.array(z.string()), year: z.number().optional(), venue: z.string().optional(), identifiers: z.object({ doi: z.string().optional(), arxiv: z.string().optional(), url: z.string().optional() }), sourceKind: z.enum(['paper', 'official-docs', 'repository', 'dataset', 'other']), provenance: z.object({ url: z.string(), locator: z.string() }), verification: z.enum(['unverified', 'verified', 'disputed', 'retracted']), license: z.string().optional() })),
    cards: z.array(z.object({ id: stringId, paperId: stringId, locator: z.object({ url: z.string(), locator: z.string() }), statement: z.string(), polarity: z.enum(['supports', 'contradicts', 'context', 'unknown']), supports: z.array(z.enum(['brief.problemDomain', 'brief.constraints', 'baseline.candidate'])), verification: z.enum(['unverified', 'verified', 'disputed', 'retracted']), reviewerNote: z.string().optional() })),
    gate: gate.nullable(),
  }),
  unlockedStageIds: z.array(stringId),
}) as unknown as z.ZodType<ResearchStudioSnapshot>
const tutorSuggestion = z.object({
  id: stringId, projectId: stringId, basedOnBriefArtifactId: stringId.nullable(), questions: z.array(z.string()),
  proposedPatch: briefPatch, skillIds: z.array(stringId),
}) as unknown as z.ZodType<TutorSuggestion>

function strict(typeSymbol: string, schema: z.ZodType): InvocationDescriptor['result'] {
  return { mode: 'strict', typeSymbol, schema }
}

function descriptor(
  method: string,
  result: InvocationDescriptor['result'],
  request?: { readonly typeSymbol: string, readonly schema: z.ZodType },
): InvocationDescriptor {
  return {
    id: `@deepseek-ai/dsh-research-studio#researchStudio/${method}`,
    service: 'researchStudioController',
    namespace: 'researchStudio',
    method,
    invocation: { kind: 'direct' },
    parameters: request === undefined ? [] : [{
      name: 'request', wire: 'request', source: 'json', codec: strict(request.typeSymbol, request.schema),
    }],
    result,
    sourceLocation: { file: 'packages/research-studio/src/adapter/controller.ts', line: 1, column: 1 },
  }
}

const snapshotResult = strict('@deepseek-ai/dsh-research-studio/types#ResearchStudioSnapshot', snapshot)

/** Explicit Client contribution mounted by the Research Studio UI plugin. */
export const TYPERT_REMOTE: TypertRemoteContribution = {
  package: '@deepseek-ai/dsh-research-studio',
  descriptors: [
    descriptor('snapshot', snapshotResult),
    descriptor('createProject', snapshotResult, { typeSymbol: '@deepseek-ai/dsh-research-studio/types#CreateResearchProjectRequest', schema: z.object({ title: z.string(), workflowPresetId: stringId }) }),
    descriptor('selectProject', snapshotResult, { typeSymbol: '@deepseek-ai/dsh-research-studio/types#SelectResearchProjectRequest', schema: z.object({ projectId: stringId }) }),
    descriptor('renameProject', snapshotResult, { typeSymbol: '@deepseek-ai/dsh-research-studio/types#RenameResearchProjectRequest', schema: z.object({ projectId: stringId, title: z.string() }) }),
    descriptor('archiveProject', snapshotResult, { typeSymbol: '@deepseek-ai/dsh-research-studio/types#ArchiveResearchProjectRequest', schema: z.object({ projectId: stringId }) }),
    descriptor('updateBrief', snapshotResult, { typeSymbol: '@deepseek-ai/dsh-research-studio/types#UpdateResearchBriefRequest', schema: z.object({ projectId: stringId, expectedBriefArtifactId: stringId.nullable(), brief: briefPatch }) }),
    descriptor('evaluateBriefReady', snapshotResult, { typeSymbol: '@deepseek-ai/dsh-research-studio/types#EvaluateResearchBriefRequest', schema: z.object({ projectId: stringId, expectedBriefArtifactId: stringId }) }),
    descriptor('suggestBriefTutor', strict('@deepseek-ai/dsh-research-studio/types#TutorSuggestion', tutorSuggestion), { typeSymbol: '@deepseek-ai/dsh-research-studio/types#SuggestResearchBriefTutorRequest', schema: z.object({ projectId: stringId, expectedBriefArtifactId: stringId.nullable() }) }),
    descriptor('savePaperCard', snapshotResult, { typeSymbol: '@deepseek-ai/dsh-research-studio/types#SavePaperCardRequest', schema: z.object({ projectId: stringId, card: z.object({ id: stringId, title: z.string(), authors: z.array(z.string()), year: z.number().optional(), venue: z.string().optional(), identifiers: z.object({ doi: z.string().optional(), arxiv: z.string().optional(), url: z.string().optional() }), sourceKind: z.enum(['paper', 'official-docs', 'repository', 'dataset', 'other']), provenance: z.object({ url: z.string(), locator: z.string() }), verification: z.enum(['unverified', 'verified', 'disputed', 'retracted']), license: z.string().optional() }) }) }),
    descriptor('saveEvidenceCard', snapshotResult, { typeSymbol: '@deepseek-ai/dsh-research-studio/types#SaveEvidenceCardRequest', schema: z.object({ projectId: stringId, card: z.object({ id: stringId, paperId: stringId, locator: z.object({ url: z.string(), locator: z.string() }), statement: z.string(), polarity: z.enum(['supports', 'contradicts', 'context', 'unknown']), supports: z.array(z.enum(['brief.problemDomain', 'brief.constraints', 'baseline.candidate'])), verification: z.enum(['unverified', 'verified', 'disputed', 'retracted']), reviewerNote: z.string().optional() }) }) }),
    descriptor('evaluateEvidenceReady', snapshotResult, { typeSymbol: '@deepseek-ai/dsh-research-studio/types#EvaluateEvidenceReadyRequest', schema: z.object({ projectId: stringId }) }),
  ],
}

export default TYPERT_REMOTE
