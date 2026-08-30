/** Pure Evidence-card validation and deterministic EVIDENCE_READY evaluation. */

import { StageId } from './types.ts'
import type { EvidenceCard, GateResult, PaperCard } from './types.ts'

const REQUIRED_TARGETS = ['brief.problemDomain', 'brief.constraints', 'baseline.candidate'] as const

/** Normalize only user-authored text; unknown facts remain absent. */
export function normalizePaperCard(input: PaperCard): PaperCard {
  return {
    ...input,
    title: input.title.trim(),
    authors: input.authors.map(author => author.trim()).filter(Boolean),
    provenance: normalizeLocator(input.provenance),
    identifiers: Object.fromEntries(Object.entries(input.identifiers)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([key, value]) => [key, value!.trim()])),
  }
}

/** Normalize a source statement without inferring citations, verification, or polarity. */
export function normalizeEvidenceCard(input: EvidenceCard): EvidenceCard {
  const { reviewerNote, ...card } = input
  return {
    ...card,
    locator: normalizeLocator(input.locator),
    statement: input.statement.trim(),
    supports: [...new Set(input.supports)],
    ...(reviewerNote === undefined || reviewerNote.trim() === '' ? {} : { reviewerNote: reviewerNote.trim() }),
  }
}

/** Deterministically evaluate whether required Evidence targets have verified, locatable support. */
export function evaluateEvidenceReady(
  papers: readonly PaperCard[],
  evidence: readonly EvidenceCard[],
): GateResult {
  const knownPapers = new Set(papers.map(paper => paper.id))
  const reasons: string[] = []
  const missing: string[] = []
  for (const card of evidence) {
    if (!knownPapers.has(card.paperId)) reasons.push(`evidence-ready.orphan-paper.${card.id}`)
    if (!isLocated(card.locator)) reasons.push(`evidence-ready.missing-locator.${card.id}`)
    if (card.statement.length === 0) reasons.push(`evidence-ready.missing-statement.${card.id}`)
  }
  for (const target of REQUIRED_TARGETS) {
    const covered = evidence.some(card => card.verification === 'verified'
      && isLocated(card.locator) && card.statement.length > 0 && card.supports.includes(target))
    if (!covered) missing.push(target)
  }
  if (missing.length > 0) reasons.push(...missing.map(target => `evidence-ready.missing-verified.${target}`))
  if (reasons.length > 0) {
    return { status: 'fail', reasons: [...new Set(reasons)].sort(), missing: [...new Set(missing)].sort(), recommendedBackflow: [StageId('evidence')] }
  }
  return { status: 'pass', reasons: ['evidence-ready.coverage-complete'], missing: [], recommendedBackflow: [] }
}

function normalizeLocator(locator: { readonly url: string; readonly locator: string }) {
  return { url: locator.url.trim(), locator: locator.locator.trim() }
}

function isLocated(locator: { readonly url: string; readonly locator: string }): boolean {
  return locator.url.length > 0 && locator.locator.length > 0
}
