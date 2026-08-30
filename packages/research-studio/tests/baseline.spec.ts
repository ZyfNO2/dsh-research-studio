import { describe, expect, it } from 'vitest'
import { evaluateBaselineFrozen } from '../src/domain/baseline.ts'

describe('BASELINE_FROZEN', () => {
  it('rejects a repository without commit, license, dataset split, or an accepted freeze record', () => {
    const result = evaluateBaselineFrozen({ id: 'b', title: 'Baseline', paperIds: [], repository: { url: 'https://example.test/repo', commit: '' }, task: 'task', datasetSplit: '', reproduction: 'unknown', knownDeviations: [], evidenceIds: [] }, undefined)
    expect(result.status).toBe('fail')
    expect(result.missing).toEqual(expect.arrayContaining(['baseline.repository.commit', 'baseline.repository.license', 'baseline.datasetSplit', 'baseline.freeze']))
  })

  it('accepts only one explicit, traceable freeze input', () => {
    const result = evaluateBaselineFrozen({ id: 'b', title: 'Baseline', paperIds: ['p'], repository: { url: 'https://example.test/repo', commit: 'abc', license: 'MIT' }, task: 'task', datasetSplit: 'test', reproduction: 'partial', knownDeviations: [], evidenceIds: ['e'] }, { baselineId: 'b', rationale: 'Comparable published setup', acceptedDeviationIds: [], frozenBy: 'researcher', frozenAt: '2026-08-30T00:00:00.000Z' })
    expect(result.status).toBe('pass')
  })
})
