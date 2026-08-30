import { describe, expect, it } from 'vitest'
import { evaluateDesignFrozen } from '../src/domain/design.ts'
import type { BaselineFreeze, ClaimDraft, CompatibilityRecord, InterfaceContract, ModuleCard } from '../src/domain/types.ts'

const contract: InterfaceContract = { semanticUnit: 'token embedding', shape: '[B,T,D]', dtype: 'float32', scale: 'normalized', ordering: 'batch,time,channel', maskPolicy: 'padding mask preserved', gradientPolicy: 'trainable adapter only' }
const baseline: BaselineFreeze = { baselineId: 'baseline-a', rationale: 'Documented', acceptedDeviationIds: [], frozenBy: 'reviewer', frozenAt: '2026-08-30T00:00:00.000Z' }
const module: ModuleCard = { id: 'module-a', source: { paperIds: ['paper-a'], license: 'Apache-2.0' }, originalRole: 'feature adapter', proposedRole: 'retrieval adapter', addressesGap: 'brief.problemDomain', input: contract, output: contract, optimization: { objective: 'ranking loss', schedule: 'fixed' }, predictedEffect: 'The adapter is predicted to improve recall under the stated condition.', competingExplanation: 'The benchmark split may account for the change.', failureModes: ['unstable low-resource training'], evidenceIds: ['evidence-a'] }
const compatibility: CompatibilityRecord = { id: 'edge-a', producer: 'baseline:baseline-a', consumer: 'module:module-a', contract, status: 'risk', requiredChecks: ['mask propagation test'] }
const claim: ClaimDraft = { id: 'claim-a', statement: 'Under the stated condition, the adapter is predicted to change recall without exceeding the latency guardrail.', condition: 'Public validation split', mechanism: 'The adapter reweights retrieval features.', intervention: 'Insert the attributed adapter after the baseline encoder.', predictedMetric: { name: 'recall@10', direction: 'increase', target: 'pre-registered comparison' }, guardrails: ['p95 latency does not exceed the baseline threshold'], falsifier: 'The pre-registered recall comparison does not meet the target.', evidenceIds: ['evidence-a'], status: 'proposed' }
const freeze = { rationale: 'Contracts and risks reviewed', frozenBy: 'reviewer', frozenAt: '2026-08-30T00:01:00.000Z' }

describe('evaluateDesignFrozen', () => {
  it('passes only with a frozen baseline, full contracts, assessed boundaries, and a falsifiable claim', () => {
    expect(evaluateDesignFrozen({ baselineFreeze: baseline, modules: [module], compatibilities: [compatibility], claim, freeze })).toMatchObject({ status: 'pass', missing: [] })
  })

  it('rejects shape-only contracts, unknown compatibility, and result language in a claim', () => {
    const result = evaluateDesignFrozen({ baselineFreeze: baseline, modules: [{ ...module, input: { ...contract, semanticUnit: '', scale: '', maskPolicy: '' } }], compatibilities: [{ ...compatibility, status: 'unknown', contract: { ...contract, gradientPolicy: '' } }], claim: { ...claim, statement: 'The method significantly outperforms the baseline.' }, freeze })
    expect(result.status).toBe('fail')
    expect(result.missing).toContain('module.module-a.input.semanticUnit')
    expect(result.missing).toContain('compatibility.edge-a.status.unknown')
    expect(result.missing).toContain('claim.statement.experimental-language')
  })
})
