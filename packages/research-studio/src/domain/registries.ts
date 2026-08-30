/** Disposable registries owned by the Research Studio service. */

import type {
  ResearchEntity,
  ResearchEntityId,
  ResearchEntityKind,
  ResearchProjectId,
  ResearchSkillDefinition,
  ResearchSkillId,
  StageDefinition,
  StageId,
  WorkflowPreset,
  WorkflowPresetId,
} from './types.ts'

interface NamedValue {
  readonly id: string
}

class NamedRegistry<T extends NamedValue> {
  private readonly values = new Map<string, T>()

  register(value: T): () => void {
    const id = value.id
    if (id.length === 0 || id.trim() !== id) {
      throw new Error('registry id must be non-blank and have no surrounding whitespace')
    }
    if (this.values.has(id)) throw new Error(`registry already contains "${id}"`)
    this.values.set(id, value)
    let active = true
    return () => {
      if (!active) return
      active = false
      if (this.values.get(id) === value) this.values.delete(id)
    }
  }

  get(id: string): T | undefined {
    return this.values.get(id)
  }

  list(): readonly T[] {
    return [...this.values.values()]
  }
}

/** Registry for project entities; lifecycle disposal removes exact contributions. */
export class EntityRegistry {
  private readonly registry = new NamedRegistry<ResearchEntity>()

  /**
   * Register one entity and return its idempotent disposer.
   * @param entity - entity contribution.
   * @returns idempotent disposer.
   */
  register(entity: ResearchEntity): () => void {
    return this.registry.register(entity)
  }

  /**
   * Resolve one entity by opaque id.
   * @param id - entity identifier.
   * @returns matching entity when registered.
   */
  get(id: ResearchEntityId): ResearchEntity | undefined {
    return this.registry.get(id)
  }

  /**
   * List entities, optionally constrained by project and kind.
   * @param projectId - optional project filter.
   * @param kind - optional kind filter.
   * @returns matching entities.
   */
  list(projectId?: ResearchProjectId, kind?: ResearchEntityKind): readonly ResearchEntity[] {
    return this.registry.list().filter(entity =>
      (projectId === undefined || entity.projectId === projectId)
      && (kind === undefined || entity.kind === kind))
  }
}

/** Registry for extensible stage definitions. */
export class StageRegistry {
  private readonly registry = new NamedRegistry<StageDefinition>()

  /**
   * Register one stage and return its idempotent disposer.
   * @param stage - stage contribution.
   * @returns idempotent disposer.
   */
  register(stage: StageDefinition): () => void {
    return this.registry.register(stage)
  }

  /**
   * Resolve one stage by id.
   * @param id - stage identifier.
   * @returns matching stage when registered.
   */
  get(id: StageId): StageDefinition | undefined {
    return this.registry.get(id)
  }

  /**
   * List stages in declared display order.
   * @returns registered stages.
   */
  list(): readonly StageDefinition[] {
    return [...this.registry.list()].sort((left, right) => left.order - right.order)
  }
}

/** Registry for reusable workflow presets. */
export class WorkflowRegistry {
  private readonly registry = new NamedRegistry<WorkflowPreset>()

  /**
   * Register one workflow preset and return its idempotent disposer.
   * @param preset - workflow contribution.
   * @returns idempotent disposer.
   */
  register(preset: WorkflowPreset): () => void {
    return this.registry.register(preset)
  }

  /**
   * Resolve one preset by id.
   * @param id - preset identifier.
   * @returns matching preset when registered.
   */
  get(id: WorkflowPresetId): WorkflowPreset | undefined {
    return this.registry.get(id)
  }

  /**
   * List registered workflow presets.
   * @returns registered presets.
   */
  list(): readonly WorkflowPreset[] {
    return this.registry.list()
  }
}

/** Registry for Research-method metadata, independent from DSH Skill providers. */
export class SkillRegistry {
  private readonly registry = new NamedRegistry<ResearchSkillDefinition>()

  /**
   * Register one research skill and return its idempotent disposer.
   * @param skill - skill contribution.
   * @returns idempotent disposer.
   */
  register(skill: ResearchSkillDefinition): () => void {
    return this.registry.register(skill)
  }

  /**
   * Resolve one research skill by id.
   * @param id - skill identifier.
   * @returns matching skill when registered.
   */
  get(id: ResearchSkillId): ResearchSkillDefinition | undefined {
    return this.registry.get(id)
  }

  /**
   * List registered research skills.
   * @returns registered skills.
   */
  list(): readonly ResearchSkillDefinition[] {
    return this.registry.list()
  }
}
