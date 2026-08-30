import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'

describe('research-studio bundle', () => {
  it('declares a parseable Host plus Client profile patch', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      dsh?: { bundle?: { patch?: string } }
    }
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    const parsed = yaml.load(readFileSync(resolve(root, 'cordis.patch.yml'), 'utf8'), {
      schema: entryListSchema,
    }) as { insert?: { id?: string; name?: string; config?: Record<string, unknown> }[] }[]
    const rows = parsed.flatMap(patch => patch.insert ?? [])
    expect(rows).toEqual([
      {
        id: 'research-studio',
        name: '@deepseek-ai/dsh-research-studio',
        config: { seedDemoProject: true },
      },
      {
        id: 'ui-research-studio',
        name: '@deepseek-ai/dsh-client-ui-research-studio',
      },
    ])
  })
})
