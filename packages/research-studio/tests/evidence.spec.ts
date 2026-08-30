import { describe, expect, it } from 'vitest'
import { evaluateEvidenceReady, normalizeEvidenceCard } from '../src/domain/evidence.ts'
import type { EvidenceCard, PaperCard } from '../src/domain/types.ts'

const paper: PaperCard = {
  id: 'paper-1', title: 'Primary source', authors: ['Author'], sourceKind: 'paper',
  provenance: { url: 'https://example.test/paper', locator: 'p. 1' }, identifiers: {}, verification: 'verified',
}

function evidence(target: EvidenceCard['supports'][number], verification: EvidenceCard['verification'] = 'verified'): EvidenceCard {
  return { id: `e-${target}`, paperId: paper.id, locator: { url: 'https://example.test/paper', locator: 'sec. 2' }, statement: 'A locatable primary-source fact.', polarity: 'context', supports: [target], verification }
}

describe('EVIDENCE_READY', () => {
  it('fails for unverified coverage and a missing source locator', () => {
    const result = evaluateEvidenceReady([paper], [
      evidence('brief.problemDomain', 'unverified'),
      { ...evidence('brief.constraints'), locator: { url: '', locator: '' } },
    ])
    expect(result.status).toBe('fail')
    expect(result.missing).toEqual(expect.arrayContaining(['brief.problemDomain', 'brief.constraints', 'baseline.candidate']))
    expect(result.reasons).toEqual(expect.arrayContaining(['evidence-ready.missing-locator.e-brief.constraints']))
  })

  it('passes only when each required target has verified, locatable evidence', () => {
    const result = evaluateEvidenceReady([paper], [
      evidence('brief.problemDomain'), evidence('brief.constraints'), evidence('baseline.candidate'),
    ])
    expect(result).toMatchObject({ status: 'pass', missing: [] })
  })

  it('preserves unknown facts instead of inventing review fields while normalizing input', () => {
    expect(normalizeEvidenceCard({ ...evidence('brief.problemDomain'), reviewerNote: '  ' })).not.toHaveProperty('reviewerNote')
  })
})
