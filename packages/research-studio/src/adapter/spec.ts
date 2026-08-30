/** DSH storage-domain declaration for Research Studio projects and artifacts. */

import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import {
  ArtifactId,
  ResearchEntityId,
  ResearchProjectId,
  StageId,
  WorkflowPresetId,
} from '../domain/types.ts'

const projectId = z.string().transform(ResearchProjectId)
const artifactId = z.string().transform(ArtifactId)

/** Durable project record schema. */
export const researchProjectRecord = z.object({
  id: projectId,
  title: z.string().min(1),
  workflowPresetId: z.string().transform(WorkflowPresetId),
  origin: z.enum(['user', 'seed']),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentStageId: z.string().transform(StageId).optional(),
  archivedAt: z.string().optional(),
})

/** Durable entity content schema carried by an artifact record. */
export const researchEntityRecord = z.object({
  id: z.string().transform(ResearchEntityId),
  projectId,
  kind: z.string(),
  title: z.string(),
  summary: z.string(),
  lifecycle: z.enum(['draft', 'candidate', 'accepted', 'rejected', 'deprecated']),
  epistemic: z.enum(['unknown', 'proposed', 'inferred', 'verified', 'supported', 'refuted']),
  origin: z.enum(['user', 'seed']),
})

/** Durable artifact record schema. */
export const researchArtifactRecord = z.object({
  id: artifactId,
  projectId,
  type: z.string().min(1),
  version: z.string().min(1),
  origin: z.enum(['user', 'seed']),
  content: z.record(z.string(), z.unknown()),
  updatedAt: z.string(),
  parentId: artifactId.optional(),
  revision: z.number().int().positive().optional(),
  lifecycle: z.enum(['draft', 'candidate', 'accepted', 'rejected']).optional(),
  createdAt: z.string().optional(),
})

/** Storage-domain spec consumed by the DSH adapter. */
export const researchStudioDomainSpec = defineDomain({
  name: 'research_studio',
  version: 1,
  tables: {
    projects: domainTable<ResearchProjectId, z.infer<typeof researchProjectRecord>>(
      researchProjectRecord,
    ),
    artifacts: domainTable<ArtifactId, z.infer<typeof researchArtifactRecord>>(
      researchArtifactRecord,
    ),
  },
})
