/** Invariant companion for the pure-consumer Research Studio Client plugin. */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-research-studio'

/** Cordis companion plugin name. */
export const name = 'client-ui-research-studio-invariant'
/** Service required before reserving package ownership. */
export const inject = ['invariants']

const install: InvariantInstaller = () => {}

/**
 * Register the package's empty pure-consumer invariant.
 * @param ctx - Cordis context carrying the invariant registry.
 * @returns the installed registration's disposer.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
