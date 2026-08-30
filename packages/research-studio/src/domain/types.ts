/** Research Studio domain vocabulary with no DSH runtime dependencies. */

type Branded<Name extends string> = string & { readonly __researchStudioBrand: Name }

/** Identifies one research project. */
export type ResearchProjectId = Branded<'ResearchProjectId'>

/**
 * Brand a raw project identifier.
 * @param value - raw identifier.
 * @returns branded identifier.
 */
export function ResearchProjectId(value: string): ResearchProjectId {
  return value as ResearchProjectId
}

/** Identifies one research entity. */
export type ResearchEntityId = Branded<'ResearchEntityId'>

/**
 * Brand a raw entity identifier.
 * @param value - raw identifier.
 * @returns branded identifier.
 */
export function ResearchEntityId(value: string): ResearchEntityId {
  return value as ResearchEntityId
}

/** Identifies one stored artifact. */
export type ArtifactId = Branded<'ResearchArtifactId'>

/**
 * Brand a raw artifact identifier.
 * @param value - raw identifier.
 * @returns branded identifier.
 */
export function ArtifactId(value: string): ArtifactId {
  return value as ArtifactId
}

/** Identifies a workflow preset. */
export type WorkflowPresetId = Branded<'ResearchWorkflowPresetId'>

/**
 * Brand a raw workflow preset identifier.
 * @param value - raw identifier.
 * @returns branded identifier.
 */
export function WorkflowPresetId(value: string): WorkflowPresetId {
  return value as WorkflowPresetId
}

/** Identifies a workflow stage. */
export type StageId = Branded<'ResearchStageId'>

/**
 * Brand a raw stage identifier.
 * @param value - raw identifier.
 * @returns branded identifier.
 */
export function StageId(value: string): StageId {
  return value as StageId
}

/** Identifies a research skill. */
export type ResearchSkillId = Branded<'ResearchSkillId'>

/**
 * Brand a raw skill identifier.
 * @param value - raw identifier.
 * @returns branded identifier.
 */
export function ResearchSkillId(value: string): ResearchSkillId {
  return value as ResearchSkillId
}

/** Identifies a DSH tool without coupling the domain to its implementation. */
export interface ToolRef {
  readonly id: string
}

/** Distinguishes authored state from explicit demonstration state. */
export type ResearchDataOrigin = 'user' | 'seed'

/** Verification state intentionally separate from an evidence statement's polarity. */
export type VerificationStatus = 'unverified' | 'verified' | 'disputed' | 'retracted'
/** Relationship of a source statement to its linked research target. */
export type EvidencePolarity = 'supports' | 'contradicts' | 'context' | 'unknown'
/** Supported primary-source categories for the first Evidence slice. */
export type EvidenceSourceKind = 'paper' | 'official-docs' | 'repository' | 'dataset' | 'other'
/** Durable, human-reviewable source locator; no inferred citation fields. */
export interface SourceLocator { readonly url: string; readonly locator: string }
/** Deliberately small, stable target vocabulary for EVIDENCE_READY. */
export type EvidenceTarget = 'brief.problemDomain' | 'brief.constraints' | 'baseline.candidate'
/** Manually recorded bibliographic or primary-source metadata. */
export interface PaperCard {
  readonly id: string
  readonly title: string
  readonly authors: readonly string[]
  readonly year?: number
  readonly venue?: string
  readonly identifiers: { readonly doi?: string; readonly arxiv?: string; readonly url?: string }
  readonly sourceKind: EvidenceSourceKind
  readonly provenance: SourceLocator
  readonly verification: VerificationStatus
  readonly license?: string
}
/** A localized statement, never an automatically promoted performance claim. */
export interface EvidenceCard {
  readonly id: string
  readonly paperId: string
  readonly locator: SourceLocator
  readonly statement: string
  readonly polarity: EvidencePolarity
  readonly supports: readonly EvidenceTarget[]
  readonly verification: VerificationStatus
  readonly reviewerNote?: string
}

/** JSON-safe value accepted by durable artifacts and Remote projections. */
export type ResearchJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly ResearchJsonValue[]
  | { readonly [key: string]: ResearchJsonValue }

/** Durable project fields. */
export interface ResearchProjectRecord {
  readonly id: ResearchProjectId
  readonly title: string
  readonly workflowPresetId: WorkflowPresetId
  readonly origin: ResearchDataOrigin
  readonly createdAt: string
  readonly updatedAt: string
  /** Current research stage; absent only on records written before Phase 2. */
  readonly currentStageId?: StageId
  /** Archive timestamp; archived projects remain recoverable and auditable. */
  readonly archivedAt?: string
}

/** One stateful research project. */
export class ResearchProject {
  /** Project identifier. */
  readonly id: ResearchProjectId
  /** User-visible project title. */
  readonly title: string
  /** Selected workflow preset. */
  readonly workflowPresetId: WorkflowPresetId
  /** Authored or demonstration origin. */
  readonly origin: ResearchDataOrigin
  /** Creation timestamp. */
  readonly createdAt: string
  /** Last-update timestamp. */
  readonly updatedAt: string
  /** Current research stage. */
  readonly currentStageId: StageId | undefined
  /** Optional archive timestamp. */
  readonly archivedAt: string | undefined

  /** Construct a project from validated durable fields. */
  constructor(record: ResearchProjectRecord) {
    this.id = record.id
    this.title = record.title
    this.workflowPresetId = record.workflowPresetId
    this.origin = record.origin
    this.createdAt = record.createdAt
    this.updatedAt = record.updatedAt
    this.currentStageId = record.currentStageId
    this.archivedAt = record.archivedAt
  }

  /**
   * Return the JSON-compatible durable representation.
   * @returns durable project record.
   */
  toRecord(): ResearchProjectRecord {
    return {
      id: this.id,
      title: this.title,
      workflowPresetId: this.workflowPresetId,
      origin: this.origin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      ...(this.currentStageId === undefined ? {} : { currentStageId: this.currentStageId }),
      ...(this.archivedAt === undefined ? {} : { archivedAt: this.archivedAt }),
    }
  }
}

/** Lifecycle of one immutable artifact revision. */
export type ArtifactLifecycle = 'draft' | 'candidate' | 'accepted' | 'rejected'

/** Structured Stage-0 brief authored by a researcher. */
export interface ResearchBrief {
  readonly problemDomain: string
  readonly researchGoal: string
  readonly constraints: readonly string[]
  readonly timeline: string
  readonly availableData: string
  readonly availableCode: string
  readonly compute: string
  readonly currentFoundation: string
  readonly initialDirection: string
  readonly unknowns: readonly string[]
}

/** Editable Research Brief fields. */
export type ResearchBriefPatch = Partial<ResearchBrief>

/** Extensible research-entity category. */
export type ResearchEntityKind =
  | 'baseline'
  | 'module'
  | 'reference'
  | 'claim'
  | (string & {})

/** Lifecycle position of a research entity. */
export type ResearchEntityLifecycle =
  | 'draft'
  | 'candidate'
  | 'accepted'
  | 'rejected'
  | 'deprecated'

/** Epistemic status kept separate from lifecycle status. */
export type ResearchEntityEpistemic =
  | 'unknown'
  | 'proposed'
  | 'inferred'
  | 'verified'
  | 'supported'
  | 'refuted'

/** JSON-compatible entity projection used by storage and Client UI. */
export interface ResearchEntity {
  readonly id: ResearchEntityId
  readonly projectId: ResearchProjectId
  readonly kind: ResearchEntityKind
  readonly title: string
  readonly summary: string
  readonly lifecycle: ResearchEntityLifecycle
  readonly epistemic: ResearchEntityEpistemic
  readonly origin: ResearchDataOrigin
}

/** One object type presented inside a stage. */
export interface ResearchObjectType {
  readonly id: ResearchEntityKind
  readonly title: string
}

/** Product-stage definition independent from agents, skills, and tools. */
export interface StageDefinition {
  readonly id: StageId
  readonly version: string
  readonly title: string
  readonly order: number
  readonly objectTypes: readonly ResearchObjectType[]
  readonly skillIds: readonly ResearchSkillId[]
  readonly tools: readonly ToolRef[]
  readonly gateIds: readonly string[]
}

/** Ordered reusable workflow preset. */
export interface WorkflowPreset {
  readonly id: WorkflowPresetId
  readonly version: string
  readonly title: string
  readonly stageIds: readonly StageId[]
}

/** Research-method metadata; execution remains owned by DSH skills. */
export interface ResearchSkillDefinition {
  readonly id: ResearchSkillId
  readonly version: string
  readonly mission: string
}

/** Gate evaluation context over one project and its artifacts. */
export interface GateContext {
  readonly project: ResearchProject
  readonly artifacts: readonly ArtifactRecord[]
}

/** Gate outcome used by later review and backflow implementations. */
export interface GateResult {
  readonly status: 'pass' | 'pass-with-warnings' | 'fail' | 'blocked'
  readonly reasons: readonly string[]
  readonly missing: readonly string[]
  readonly recommendedBackflow: readonly StageId[]
}

/** Review rule interface; the first phase defines the seam but no gate engine. */
export interface Gate {
  readonly id: string
  evaluate(context: GateContext): GateResult | Promise<GateResult>
}

/** Persisted artifact metadata and JSON object content. */
export interface ArtifactRecord {
  readonly id: ArtifactId
  readonly projectId: ResearchProjectId
  readonly type: string
  readonly version: string
  readonly origin: ResearchDataOrigin
  readonly content: Readonly<Record<string, ResearchJsonValue>>
  readonly updatedAt: string
  /** Immutable lineage pointer to the immediately preceding revision. */
  readonly parentId?: ArtifactId
  /** Monotonic revision within one artifact lineage. */
  readonly revision?: number
  /** Explicit authoring lifecycle; absent only on Phase-1 records. */
  readonly lifecycle?: ArtifactLifecycle
  /** Creation time of this immutable revision. */
  readonly createdAt?: string
}

/** Persistent artifact operations implemented by the DSH storage adapter. */
export interface ArtifactStore {
  get(id: ArtifactId): ArtifactRecord | undefined
  list(projectId?: ResearchProjectId): readonly ArtifactRecord[]
  put(artifact: ArtifactRecord): Promise<void>
  delete(id: ArtifactId): Promise<boolean>
}

/** Persistent project operations implemented by the DSH storage adapter. */
export interface ResearchProjectStore {
  get(id: ResearchProjectId): ResearchProjectRecord | undefined
  list(): readonly ResearchProjectRecord[]
  put(project: ResearchProjectRecord): Promise<void>
  delete(id: ResearchProjectId): Promise<boolean>
}

/** One changed top-level field between two artifact revisions. */
export interface ArtifactFieldDiff {
  readonly field: string
  readonly before: ResearchJsonValue | undefined
  readonly after: ResearchJsonValue | undefined
}

/** Host-owned Research Brief projection. */
export interface ResearchBriefProjection {
  readonly artifact: ArtifactRecord
  readonly value: ResearchBrief
}

/** Deterministic Tutor proposal; applying it is a separate confirmed mutation. */
export interface TutorSuggestion {
  readonly id: string
  readonly projectId: ResearchProjectId
  readonly basedOnBriefArtifactId: ArtifactId | null
  readonly questions: readonly string[]
  readonly proposedPatch: ResearchBriefPatch
  readonly skillIds: readonly ResearchSkillId[]
}

/** Durable record of one Gate evaluation against an exact Brief revision. */
export interface GateEvaluationRecord {
  readonly gateId: 'BRIEF_READY'
  readonly briefArtifactId: ArtifactId
  readonly result: GateResult
  readonly evaluatedAt: string
}

/** Complete Host projection consumed by the first Client UI. */
export interface ResearchStudioSnapshot {
  readonly runtime: 'host'
  readonly projects: readonly ResearchProjectRecord[]
  readonly project: ResearchProjectRecord | null
  readonly preset: WorkflowPreset
  readonly stages: readonly StageDefinition[]
  readonly entities: readonly ResearchEntity[]
  readonly brief: ResearchBriefProjection | null
  readonly briefHistory: readonly ArtifactRecord[]
  readonly gate: GateResult | null
  readonly unlockedStageIds: readonly StageId[]
}

/** JSON-compatible Remote command inputs, publicly exported from `./types`. */
export interface CreateResearchProjectRequest { readonly title: string; readonly workflowPresetId: string }
/** Select-project Remote request. */
export interface SelectResearchProjectRequest { readonly projectId: string }
/** Rename-project Remote request. */
export interface RenameResearchProjectRequest { readonly projectId: string; readonly title: string }
/** Archive-project Remote request. */
export interface ArchiveResearchProjectRequest { readonly projectId: string }
/** Brief-update Remote request. */
export interface UpdateResearchBriefRequest {
  readonly projectId: string
  readonly expectedBriefArtifactId: string | null
  readonly brief: ResearchBriefPatch
}
/** BRIEF_READY Remote request. */
export interface EvaluateResearchBriefRequest {
  readonly projectId: string
  readonly expectedBriefArtifactId: string
}
/** Tutor-suggestion Remote request. */
export interface SuggestResearchBriefTutorRequest {
  readonly projectId: string
  readonly expectedBriefArtifactId: string | null
}
