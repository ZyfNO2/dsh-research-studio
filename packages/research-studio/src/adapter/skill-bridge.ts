/** Runtime bridge from pure Stage-0 metadata to the Host Skill registry. */

import { Context, Service } from '@deepseek-ai/cordis'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'

/** Register the four fixed Research Studio methods in the existing DSH Skill service. */
export class ResearchStudioSkillBridge extends Service {
  static inject = ['skills', 'researchStudio']

  constructor(ctx: Context) {
    super(ctx, 'researchStudioSkillBridge')
    for (const skill of ctx.researchStudio.skills.list()) {
      const registration: SkillRegistration = {
        name: String(skill.id),
        description: skill.mission,
        source: 'runtime',
        provider: 'research-studio',
        content: [
          `# ${skill.id}`,
          '',
          skill.mission,
          '',
          'Work only from the active Research Brief. Mark unresolved information as unknown; do not invent evidence or advance later research stages.',
        ].join('\n'),
      }
      ctx.skills.register(registration)
    }
  }
}
