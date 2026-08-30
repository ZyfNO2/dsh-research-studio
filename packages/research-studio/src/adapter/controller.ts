/** Thin Typert Remote adapter for Research Studio application use cases. */

import { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteFailure, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { ResearchStudioApplicationError } from '../application/index.ts'
import { ArtifactId, ResearchProjectId, WorkflowPresetId } from '../domain/types.ts'
import type {
  ArchiveResearchProjectRequest,
  CreateResearchProjectRequest,
  EvaluateResearchBriefRequest,
  EvaluateEvidenceReadyRequest,
  RenameResearchProjectRequest,
  ResearchStudioSnapshot,
  SaveEvidenceCardRequest,
  SavePaperCardRequest,
  SelectResearchProjectRequest,
  SuggestResearchBriefTutorRequest,
  TutorSuggestion,
  UpdateResearchBriefRequest,
} from '../domain/types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of the `researchStudio` Remote namespace. */
    researchStudioController: ResearchStudioController
  }
}

/** Host adapter backing the generated `ctx.remote.researchStudio` namespace. */
export class ResearchStudioController extends TypertRemoteService {
  static inject = ['typert', 'researchStudio']

  constructor(ctx: Context) {
    super(ctx, 'researchStudioController', { namespace: 'researchStudio' })
  }

  /**
   * Return the complete Host-owned Research Studio projection.
   * @returns current projection.
   */
  @Remote
  snapshot(): ResearchStudioSnapshot {
    return this.ctx.researchStudio.snapshot()
  }

  /**
   * Create one project.
   * @param request - project fields.
   * @returns updated projection.
   */
  @Remote
  createProject(request: CreateResearchProjectRequest): Promise<ResearchStudioSnapshot> {
    return this.map(() => this.ctx.researchStudio.application.createProject(
      request.title, WorkflowPresetId(request.workflowPresetId),
    ))
  }

  /**
   * Select one project.
   * @param request - project selector.
   * @returns updated projection.
   */
  @Remote
  selectProject(request: SelectResearchProjectRequest): Promise<ResearchStudioSnapshot> {
    return this.map(() => this.ctx.researchStudio.application.selectProject(ResearchProjectId(request.projectId)))
  }

  /**
   * Rename one project.
   * @param request - project selector and title.
   * @returns updated projection.
   */
  @Remote
  renameProject(request: RenameResearchProjectRequest): Promise<ResearchStudioSnapshot> {
    return this.map(() => this.ctx.researchStudio.application.renameProject(
      ResearchProjectId(request.projectId), request.title,
    ))
  }

  /**
   * Archive one project.
   * @param request - project selector.
   * @returns updated projection.
   */
  @Remote
  archiveProject(request: ArchiveResearchProjectRequest): Promise<ResearchStudioSnapshot> {
    return this.map(() => this.ctx.researchStudio.application.archiveProject(ResearchProjectId(request.projectId)))
  }

  /**
   * Save one Brief revision.
   * @param request - expected head and patch.
   * @returns updated projection.
   */
  @Remote
  updateBrief(request: UpdateResearchBriefRequest): Promise<ResearchStudioSnapshot> {
    return this.map(() => this.ctx.researchStudio.application.updateBrief(
      ResearchProjectId(request.projectId),
      request.expectedBriefArtifactId === null ? null : ArtifactId(request.expectedBriefArtifactId),
      request.brief,
    ))
  }

  /**
   * Evaluate BRIEF_READY.
   * @param request - exact Brief head.
   * @returns updated projection.
   */
  @Remote
  evaluateBriefReady(request: EvaluateResearchBriefRequest): Promise<ResearchStudioSnapshot> {
    return this.map(() => this.ctx.researchStudio.application.evaluateBriefReady(
      ResearchProjectId(request.projectId), ArtifactId(request.expectedBriefArtifactId),
    ))
  }

  /**
   * Suggest bounded Brief refinements.
   * @param request - exact optional Brief head.
   * @returns deterministic suggestion.
   */
  @Remote
  suggestBriefTutor(request: SuggestResearchBriefTutorRequest): TutorSuggestion {
    try {
      return this.ctx.researchStudio.application.suggestBriefTutor(
        ResearchProjectId(request.projectId),
        request.expectedBriefArtifactId === null ? null : ArtifactId(request.expectedBriefArtifactId),
      )
    } catch (error) {
      throw toRemoteFailure(error)
    }
  }

  /** Save one manually reviewed PaperCard revision. */
  @Remote
  savePaperCard(request: SavePaperCardRequest): Promise<ResearchStudioSnapshot> {
    return this.map(() => this.ctx.researchStudio.application.savePaperCard(
      ResearchProjectId(request.projectId), request.card,
    ))
  }

  /** Save one source-locatable EvidenceCard revision. */
  @Remote
  saveEvidenceCard(request: SaveEvidenceCardRequest): Promise<ResearchStudioSnapshot> {
    return this.map(() => this.ctx.researchStudio.application.saveEvidenceCard(
      ResearchProjectId(request.projectId), request.card,
    ))
  }

  /** Evaluate the deterministic EVIDENCE_READY gate. */
  @Remote
  evaluateEvidenceReady(request: EvaluateEvidenceReadyRequest): Promise<ResearchStudioSnapshot> {
    return this.map(() => this.ctx.researchStudio.application.evaluateEvidenceReady(ResearchProjectId(request.projectId)))
  }

  private async map<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      throw toRemoteFailure(error)
    }
  }
}

function toRemoteFailure(error: unknown): unknown {
  if (error instanceof ResearchStudioApplicationError) {
    return new TypertRemoteFailure({ code: error.code, message: error.message, details: error.details })
  }
  return error
}
