/** DSH Service adapter for the framework-independent Research Studio domain. */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import type { Domain, KvTable } from '@deepseek-ai/dsh-storage-domain'
import { ResearchStudioApplication } from '../application/index.ts'
import {
  ArtifactId,
  MVPResearchPreset,
  ResearchEntityId,
  ResearchProjectId,
  StageId,
  registerMvpResearchPreset,
  registerStageZeroSkills,
  EntityRegistry,
  SkillRegistry,
  StageRegistry,
  WorkflowRegistry,
} from '../domain/index.ts'
import type {
  ArtifactId as ArtifactIdType,
  ArtifactRecord,
  ArtifactStore,
  ResearchEntity,
  ResearchProjectId as ResearchProjectIdType,
  ResearchProjectRecord,
  ResearchProjectStore,
  ResearchStudioSnapshot,
} from '../domain/index.ts'
import { ResearchStudioController } from './controller.ts'
import { ResearchStudioSkillBridge } from './skill-bridge.ts'
import { DshArtifactStore, DshResearchProjectStore } from './storage.ts'
import { researchEntityRecord, researchStudioDomainSpec } from './spec.ts'

/** Research Studio startup configuration. */
export interface Config {
  /** Seed an explicitly labelled demonstration project when storage has no project. */
  readonly seedDemoProject?: boolean
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Stateful Research Studio domain service. */
    researchStudio: ResearchStudioService
  }
}

/** Stateful Research Studio service over DSH storage and Remote integration. */
export class ResearchStudioService extends Service {
  static inject = ['storageDomain']
  static Config: Schema<Config> = z.object({ seedDemoProject: z.boolean().default(false) })

  /** Project entity registry. */
  readonly entities: EntityRegistry = new EntityRegistry()
  /** Workflow-preset registry. */
  readonly workflows: WorkflowRegistry = new WorkflowRegistry()
  /** Research-stage registry. */
  readonly stages: StageRegistry = new StageRegistry()
  /** Research-method metadata registry. */
  readonly skills: SkillRegistry = new SkillRegistry()

  private artifactsAdapter?: DshArtifactStore
  private projectsAdapter?: DshResearchProjectStore
  private applicationAdapter?: ResearchStudioApplication

  constructor(ctx: Context, private readonly config: Config = {}) {
    super(ctx, 'researchStudio')
    ctx.effect(() => registerMvpResearchPreset(this.stages, this.workflows), 'research-studio: MVP preset')
    ctx.effect(() => registerStageZeroSkills(this.skills), 'research-studio: Stage-0 skills')
    ctx.plugin(ResearchStudioController)
    ctx.plugin(ResearchStudioSkillBridge)
  }

  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(researchStudioDomainSpec)
    this.ctx.effect(() => () => domain.close(), 'research-studio: domain close')
    this.installDomain(domain)
    this.loadEntities()
    if (this.config.seedDemoProject === true && this.projects.list().length === 0) {
      await this.seedDemoProject()
    }
    this.applicationAdapter = new ResearchStudioApplication({
      projects: this.projects,
      artifacts: this.artifacts,
      entities: this.entities,
      workflows: this.workflows,
      stages: this.stages,
      skills: this.skills,
    })
    this.applicationAdapter.initialize()
    this.assertPresetIntegrity()
  }

  /**
   * Resolve initialized artifact persistence.
   * @returns artifact store.
   */
  get artifacts(): ArtifactStore {
    if (this.artifactsAdapter === undefined) throw new Error('Research Studio artifact storage is not initialized')
    return this.artifactsAdapter
  }

  /**
   * Resolve initialized project persistence.
   * @returns project store.
   */
  get projects(): ResearchProjectStore {
    if (this.projectsAdapter === undefined) throw new Error('Research Studio project storage is not initialized')
    return this.projectsAdapter
  }

  /**
   * Resolve the initialized application boundary.
   * @returns application service.
   */
  get application(): ResearchStudioApplication {
    if (this.applicationAdapter === undefined) throw new Error('Research Studio application is not initialized')
    return this.applicationAdapter
  }

  /**
   * Return the current Host projection.
   * @returns current projection.
   */
  snapshot(): ResearchStudioSnapshot {
    return this.application.snapshot()
  }

  private installDomain(domain: Domain<typeof researchStudioDomainSpec>): void {
    this.artifactsAdapter = new DshArtifactStore(
      domain.table('artifacts') as KvTable<ArtifactIdType, ArtifactRecord>,
    )
    this.projectsAdapter = new DshResearchProjectStore(
      domain.table('projects') as KvTable<ResearchProjectIdType, ResearchProjectRecord>,
    )
  }

  private loadEntities(): void {
    for (const artifact of this.artifacts.list()) {
      if (artifact.type !== 'research-entity') continue
      this.entities.register(researchEntityRecord.parse(artifact.content))
    }
  }

  private async seedDemoProject(): Promise<void> {
    const now = new Date().toISOString()
    const project: ResearchProjectRecord = {
      id: ResearchProjectId('seed-mvp-project'),
      title: 'MVP Research Project',
      workflowPresetId: MVPResearchPreset.id,
      origin: 'seed',
      createdAt: now,
      updatedAt: now,
      currentStageId: StageId('research-brief'),
    }
    const entities: ResearchEntity[] = [
      seedEntity(project.id, 'baseline', 'Baseline A', 'Current baseline · pending reproduction'),
      seedEntity(project.id, 'module', 'Module B', 'Candidate intervention for the selected limitation'),
      seedEntity(project.id, 'reference', 'Reference P-017', 'Module source · evidence pending review'),
      seedEntity(project.id, 'claim', 'Claim C1', 'Proposed claim · no experiment result attached'),
    ]
    for (const entity of entities) {
      await this.artifacts.put({
        id: ArtifactId(`seed-${entity.kind}`), projectId: project.id, type: 'research-entity',
        version: '1.0.0', origin: 'seed', content: { ...entity }, updatedAt: now,
      })
    }
    await this.projects.put(project)
    for (const entity of entities) this.entities.register(entity)
  }

  private assertPresetIntegrity(): void {
    for (const preset of this.workflows.list()) {
      for (const stageId of preset.stageIds) {
        if (this.stages.get(stageId) === undefined) {
          throw new Error(`workflow preset "${preset.id}" references unknown stage "${stageId}"`)
        }
      }
    }
  }
}

function seedEntity(
  projectId: ResearchProjectIdType,
  kind: ResearchEntity['kind'],
  title: string,
  summary: string,
): ResearchEntity {
  return {
    id: ResearchEntityId(`seed-${kind}`), projectId, kind, title, summary,
    lifecycle: kind === 'baseline' ? 'accepted' : 'candidate', epistemic: 'proposed', origin: 'seed',
  }
}

export default ResearchStudioService
