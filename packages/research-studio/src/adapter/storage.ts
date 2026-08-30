/** ArtifactStore implementation over the DSH storage-domain data form. */

import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import type {
  ArtifactId,
  ArtifactRecord,
  ArtifactStore,
  ResearchProjectId,
  ResearchProjectRecord,
  ResearchProjectStore,
} from '../domain/types.ts'

/** DSH-backed artifact persistence adapter. */
export class DshArtifactStore implements ArtifactStore {
  /** Adopt the already-open Research Studio artifact table. */
  constructor(private readonly table: KvTable<ArtifactId, ArtifactRecord>) {}

  /** Resolve one artifact from the authoritative in-memory domain state. */
  get(id: ArtifactId): ArtifactRecord | undefined {
    return this.table.get(id)
  }

  /** List artifacts, optionally constrained to one project. */
  list(projectId?: ResearchProjectId): readonly ArtifactRecord[] {
    return [...this.table.entries()]
      .map(([, artifact]) => artifact)
      .filter(artifact => projectId === undefined || artifact.projectId === projectId)
  }

  /** Persist or replace one artifact before publishing it to callers. */
  async put(artifact: ArtifactRecord): Promise<void> {
    await this.table.put(artifact.id, artifact)
  }

  /** Delete one artifact and report whether it existed. */
  async delete(id: ArtifactId): Promise<boolean> {
    return await this.table.delete(id)
  }
}

/** DSH-backed project persistence without exposing KvTable to application use cases. */
export class DshResearchProjectStore implements ResearchProjectStore {
  constructor(private readonly table: KvTable<ResearchProjectId, ResearchProjectRecord>) {}

  get(id: ResearchProjectId): ResearchProjectRecord | undefined {
    return this.table.get(id)
  }

  list(): readonly ResearchProjectRecord[] {
    return [...this.table.entries()].map(([, project]) => project)
  }

  async put(project: ResearchProjectRecord): Promise<void> {
    await this.table.put(project.id, project)
  }

  async delete(id: ResearchProjectId): Promise<boolean> {
    return await this.table.delete(id)
  }
}
