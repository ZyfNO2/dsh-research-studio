/** Package-owned invariants for the Research Studio Host service. */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-research-studio'

/** Cordis companion plugin name. */
export const name = 'research-studio-invariant'
/** Services required before checking registry references. */
export const inject = ['invariants']

const install: InvariantInstaller = Object.assign((ctx: Context, fail: Parameters<InvariantInstaller>[1]) => {
  for (const preset of ctx.researchStudio.workflows.list()) {
    for (const stageId of preset.stageIds) {
      if (ctx.researchStudio.stages.get(stageId) === undefined) {
        fail(`workflow preset "${preset.id}" references unknown stage "${stageId}"`)
      }
    }
  }
}, { inject: ['researchStudio'] })

/**
 * Register Research Studio's cross-registry integrity check.
 * @param ctx - Cordis context carrying the invariant registry.
 * @returns the installed registration's disposer.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
