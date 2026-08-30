import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { MemoryMediaPool, MemoryStorageBackend } from '../../../../deepseek-harness/packages/storage/storage-domain/tests/helpers/memory-backend.ts'
import ResearchStudioService from '../src/index.ts'

describe('ResearchStudioService', () => {
  it('loads a Host snapshot from its storage-domain state and MVP registries', async () => {
    const ctx = new Context()
    await ctx.plugin(Storage)
    await ctx.plugin(SkillRegistry)
    ctx.storage.backend.register('memory', new MemoryStorageBackend())
    const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} })
    ctx.storage.mount('domain', facility)
    ctx.provide('storageDomain', facility)

    const fiber = await ctx.plugin(ResearchStudioService, { seedDemoProject: true })
    const snapshot = ctx.researchStudio.snapshot()

    expect(snapshot.runtime).toBe('host')
    expect(snapshot.project).toMatchObject({ origin: 'seed', workflowPresetId: 'mvp-research' })
    expect(snapshot.stages.map(stage => stage.title)).toEqual([
      'Research Brief', 'Evidence', 'Research Design', 'BuildSpec', 'Experiment', 'Paper & Audit',
    ])
    expect(snapshot.entities.map(entity => entity.kind)).toEqual([
      'baseline', 'module', 'reference', 'claim',
    ])
    expect((await ctx.skills.list()).filter(skill => skill.provider === 'research-studio').map(skill => skill.name)).toEqual([
      'feasibility-check', 'problem-formulation', 'research-planning', 'scope-definition',
    ])

    await fiber.dispose()
    expect((await ctx.skills.list()).filter(skill => skill.provider === 'research-studio')).toEqual([])
    await facility.closeAll()
  })

  it('restores the active project and Brief from the same storage medium after restart', async () => {
    const pool = new MemoryMediaPool()
    const first = await boot(pool)
    const created = await first.ctx.researchStudio.application.createProject('Persistent study')
    const projectId = created.project!.id
    const saved = await first.ctx.researchStudio.application.updateBrief(projectId, null, {
      problemDomain: 'Persistent research state',
      unknowns: ['Resource limits are not fully known'],
    })
    const briefId = saved.brief!.artifact.id
    await first.fiber.dispose()
    await first.facility.closeAll()

    const second = await boot(pool)
    const restored = second.ctx.researchStudio.snapshot()
    expect(restored.project?.id).toBe(projectId)
    expect(restored.brief?.artifact.id).toBe(briefId)
    expect(restored.brief?.value.problemDomain).toBe('Persistent research state')
    await second.fiber.dispose()
    await second.facility.closeAll()
  })
})

async function boot(pool: MemoryMediaPool) {
  const ctx = new Context()
  await ctx.plugin(Storage)
  await ctx.plugin(SkillRegistry)
  ctx.storage.backend.register('memory', new MemoryStorageBackend(pool))
  const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} })
  ctx.storage.mount('domain', facility)
  ctx.provide('storageDomain', facility)
  const fiber = await ctx.plugin(ResearchStudioService)
  return { ctx, facility, fiber }
}
