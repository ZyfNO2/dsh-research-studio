/** Browser Research Studio conversation view plugin. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import researchStudioRemote from '@deepseek-ai/dsh-research-studio/remote'
import { en, zh, type ResearchStudioLocaleKey } from './locales.ts'
import {
  ResearchStudioView,
  type ResearchStudioViewInjected,
} from './ResearchStudioView.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Research Studio labels and status copy. */
    researchStudio: ResearchStudioLocaleKey
  }
}

/** Dictionary namespace owned by the Research Studio view. */
export const NS = 'researchStudio'
/** Services required by the conversation slot and generated Remote face. */
export const inject = ['slots', 'locale', 'remote']

/**
 * Register the Host-backed Research Studio conversation view.
 * @param ctx - Client root context.
 */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(researchStudioRemote)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-research-studio: dictionaries')
  const t = ctx.locale.bind(NS)
  const injected = (): ResearchStudioViewInjected => ({
    snapshot: async () => {
      const result = await ctx.remote.researchStudio.snapshot()
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.value
    },
    createProject: async request => ctx.remote.researchStudio.createProject(request),
    selectProject: async request => ctx.remote.researchStudio.selectProject(request),
    renameProject: async request => ctx.remote.researchStudio.renameProject(request),
    archiveProject: async request => ctx.remote.researchStudio.archiveProject(request),
    updateBrief: async request => ctx.remote.researchStudio.updateBrief(request),
    evaluateBriefReady: async request => ctx.remote.researchStudio.evaluateBriefReady(request),
    suggestBriefTutor: async request => ctx.remote.researchStudio.suggestBriefTutor(request),
  })
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'research-studio',
    order: 20,
    locale: NS,
    label: () => t('view'),
    inject: injected,
  }, ResearchStudioView))
  return async () => { await disposeRemote() }
}

export { ResearchStudioView } from './ResearchStudioView.tsx'
export type { ResearchStudioViewInjected, ResearchStudioViewProps } from './ResearchStudioView.tsx'
