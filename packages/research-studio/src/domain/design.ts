/** Pure Research Design validation; it does not execute code or make performance claims. */

import { StageId } from './types.ts'
import type { BaselineFreeze, ClaimDraft, CompatibilityRecord, DesignFreeze, GateResult, InterfaceContract, ModuleCard } from './types.ts'

const CONTRACT_FIELDS: readonly (keyof InterfaceContract)[] = [
  'semanticUnit', 'shape', 'dtype', 'scale', 'ordering', 'maskPolicy', 'gradientPolicy',
]

/** Return missing semantic boundary fields. Shape alone is intentionally insufficient. */
export function missingContractFields(contract: InterfaceContract): readonly string[] {
  return CONTRACT_FIELDS.filter(field => contract[field].trim() === '').map(field => `contract.${field}`)
}

/** Evaluate the deterministic DESIGN_FROZEN prerequisites for the current artifact projection. */
export function evaluateDesignFrozen(input: {
  readonly baselineFreeze: BaselineFreeze | null
  readonly modules: readonly ModuleCard[]
  readonly compatibilities: readonly CompatibilityRecord[]
  readonly claim: ClaimDraft | null
  readonly freeze: DesignFreeze | undefined
}): GateResult {
  const missing: string[] = []
  if (input.baselineFreeze === null) missing.push('baseline.freeze')
  if (input.modules.length === 0) missing.push('module.candidate')
  for (const module of input.modules) {
    const prefix = `module.${module.id}`
    if (module.source.paperIds.length === 0 && (module.source.repository?.trim() ?? '') === '') missing.push(`${prefix}.source`)
    if ((module.source.license?.trim() ?? '') === '') missing.push(`${prefix}.source.license`)
    if (module.originalRole.trim() === '') missing.push(`${prefix}.originalRole`)
    if (module.proposedRole.trim() === '') missing.push(`${prefix}.proposedRole`)
    if (module.addressesGap.trim() === '') missing.push(`${prefix}.addressesGap`)
    if (module.optimization.objective.trim() === '') missing.push(`${prefix}.optimization.objective`)
    if (module.optimization.schedule.trim() === '') missing.push(`${prefix}.optimization.schedule`)
    if (module.predictedEffect.trim() === '') missing.push(`${prefix}.predictedEffect`)
    if (module.competingExplanation.trim() === '') missing.push(`${prefix}.competingExplanation`)
    if (module.failureModes.length === 0) missing.push(`${prefix}.failureModes`)
    for (const field of missingContractFields(module.input)) missing.push(`${prefix}.input.${field.slice('contract.'.length)}`)
    for (const field of missingContractFields(module.output)) missing.push(`${prefix}.output.${field.slice('contract.'.length)}`)
    const incoming = input.compatibilities.filter(record => record.consumer === `module:${module.id}`)
    if (incoming.length === 0) missing.push(`${prefix}.compatibility.incoming`)
  }
  for (const record of input.compatibilities) {
    const prefix = `compatibility.${record.id}`
    if (record.producer.trim() === '') missing.push(`${prefix}.producer`)
    if (record.consumer.trim() === '') missing.push(`${prefix}.consumer`)
    if (record.status === 'unknown') missing.push(`${prefix}.status.unknown`)
    if (record.status === 'fail') missing.push(`${prefix}.status.fail`)
    if (record.requiredChecks.length === 0) missing.push(`${prefix}.requiredChecks`)
    for (const field of missingContractFields(record.contract)) missing.push(`${prefix}.${field}`)
  }
  const claim = input.claim
  if (claim === null) missing.push('claim.draft')
  else {
    if (claim.status !== 'proposed') missing.push('claim.status')
    if (claim.statement.trim() === '') missing.push('claim.statement')
    if (claim.condition.trim() === '') missing.push('claim.condition')
    if (claim.mechanism.trim() === '') missing.push('claim.mechanism')
    if (claim.intervention.trim() === '') missing.push('claim.intervention')
    if (claim.predictedMetric.name.trim() === '' || claim.predictedMetric.target.trim() === '') missing.push('claim.predictedMetric')
    if (claim.guardrails.length === 0) missing.push('claim.guardrails')
    if (claim.falsifier.trim() === '') missing.push('claim.falsifier')
    if (/(already|significantly|outperform|state[- ]of[- ]the[- ]art|已提升|显著优于|实验表明)/i.test(claim.statement)) missing.push('claim.statement.experimental-language')
  }
  if (input.freeze === undefined) missing.push('design.freeze')
  else if (input.freeze.rationale.trim() === '') missing.push('design.freeze.rationale')
  return missing.length === 0
    ? { status: 'pass', reasons: ['design-frozen.auditable-design-recorded'], missing: [], recommendedBackflow: [] }
    : { status: 'fail', reasons: missing.map(item => `design-frozen.missing.${item}`), missing, recommendedBackflow: [StageId('research-design')] }
}
