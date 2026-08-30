import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { defineConfig } from 'tsdown'
import { transform } from 'lightningcss'

const packageId = '@deepseek-ai/dsh-client-ui-research-studio'
const cssPrefix = '\0research-studio-css:'
const cssVirtualSuffix = '.mjs'

/**
 * Product-owned DSH Client bundle bridge. It keeps framework platform modules
 * external for the Web module table, bundles this plugin's Remote descriptor,
 * and injects CSS-module text when the plugin factory executes.
 */
export default defineConfig(({ env }) => {
  const node = {
    entry: ['lib/types/{index,invariant}.js'],
    outDir: 'lib',
    format: ['esm'] as const,
    platform: 'node' as const,
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  }
  if (env?.DSH_BUILD_FACE !== 'client') return node
  return [node, {
    entry: { client: 'lib/types/client/index.js' },
    outDir: 'lib',
    format: ['cjs'] as const,
    platform: 'browser' as const,
    target: 'es2024',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: /^(?:react(?:\/jsx-runtime)?|@deepseek-ai\/cordis)$/,
      alwaysBundle: (specifier: string) => !/^(?:react(?:\/jsx-runtime)?|@deepseek-ai\/cordis)$/.test(specifier),
    },
    plugins: [{
      name: 'research-studio-css-modules',
      resolveId(source: string, importer: string | undefined) {
        if (!source.endsWith('.module.css') || importer === undefined) return null
        // This pass bundles tsc's lib/types output. Its adjacent source map
        // points at src/, so recover that source-relative stylesheet path.
        const sourceImporter = importer.replace(/([\\/])lib\1types(?=[\\/])/u, '$1src')
        const file = isAbsolute(source) ? source : resolve(dirname(sourceImporter), source)
        return `${cssPrefix}${file}${cssVirtualSuffix}`
      },
      async load(id: string) {
        if (!id.startsWith(cssPrefix)) return null
        const file = id.slice(cssPrefix.length, -cssVirtualSuffix.length)
        this.addWatchFile(file)
        const output = transform({
          filename: file,
          code: await readFile(file),
          cssModules: { pattern: '[hash]_[local]' },
          minify: true,
        })
        const classes = Object.fromEntries(Object.entries(output.exports ?? {}).map(([key, value]) => [key, value.name]))
        return [
          `const css = ${JSON.stringify(output.code.toString())};`,
          `const id = ${JSON.stringify(`${packageId}/ResearchStudioView.module.css`)};`,
          "if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(id) + ']') === null) {",
          '  const tag = document.createElement(\'style\');',
          `  tag.dataset.plugin = ${JSON.stringify(packageId)};`,
          '  tag.dataset.pluginCss = id;',
          '  tag.textContent = css;',
          '  document.head.appendChild(tag);',
          '}',
          `export default ${JSON.stringify(classes)};`,
        ].join('\n')
      },
    }],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageId)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  }]
})
