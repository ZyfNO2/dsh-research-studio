import { describe, expect, it } from 'vitest'
import remote from '../src/integration/remote-contract.ts'

describe('Research Studio external Remote contract', () => {
  it('exposes every Phase-2 controller method as one strict descriptor', () => {
    expect(remote.package).toBe('@deepseek-ai/dsh-research-studio')
    expect(remote.descriptors.map(descriptor => descriptor.method)).toEqual([
      'snapshot', 'createProject', 'selectProject', 'renameProject', 'archiveProject',
      'updateBrief', 'evaluateBriefReady', 'suggestBriefTutor', 'savePaperCard',
      'saveEvidenceCard', 'evaluateEvidenceReady',
    ])
    for (const descriptor of remote.descriptors) {
      expect(descriptor.result.mode).toBe('strict')
      expect(descriptor.namespace).toBe('researchStudio')
      expect(descriptor.service).toBe('researchStudioController')
    }
  })

  it('rejects malformed mutation requests before they cross the Client boundary', () => {
    const rename = remote.descriptors.find(descriptor => descriptor.method === 'renameProject')!
    const request = rename.parameters[0]!
    expect(request.codec.mode).toBe('strict')
    if (request.codec.mode !== 'strict') throw new Error('expected strict request codec')
    expect(request.codec.schema.safeParse({ projectId: '', title: 'Valid title' }).success).toBe(false)
    expect(request.codec.schema.safeParse({ projectId: 'project-1', title: 'Valid title' }).success).toBe(true)
  })
})
