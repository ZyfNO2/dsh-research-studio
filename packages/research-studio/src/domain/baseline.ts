/** Pure baseline-freeze validation; no code execution or repository mutation. */

import { StageId } from './types.ts'
import type { BaselineCard, BaselineFreeze, GateResult } from './types.ts'

/** Evaluate one selected baseline against deterministic reproducibility prerequisites. */
export function evaluateBaselineFrozen(
  baseline: BaselineCard | undefined,
  freeze: BaselineFreeze | undefined,
): GateResult {
  const missing: string[] = []
  if (baseline === undefined) missing.push('baseline.candidate')
  else {
    if (baseline.task.trim() === '') missing.push('baseline.task')
    if (baseline.datasetSplit.trim() === '') missing.push('baseline.datasetSplit')
    if (baseline.repository?.url.trim() === '') missing.push('baseline.repository.url')
    if (baseline.repository?.commit.trim() === '') missing.push('baseline.repository.commit')
    if (baseline.repository?.license === undefined || baseline.repository.license.trim() === '') {
      missing.push('baseline.repository.license')
    }
    if (baseline.reproduction === 'failed') missing.push('baseline.reproduction.failed')
  }
  if (freeze === undefined) missing.push('baseline.freeze')
  else if (freeze.rationale.trim() === '') missing.push('baseline.freeze.rationale')
  if (missing.length > 0) return {
    status: 'fail', reasons: missing.map(item => `baseline-frozen.missing.${item}`), missing,
    recommendedBackflow: [StageId('evidence')],
  }
  return { status: 'pass', reasons: ['baseline-frozen.reproducible-context-recorded'], missing: [], recommendedBackflow: [] }
}
