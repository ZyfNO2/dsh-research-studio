import { defineConfig } from 'tsdown'

/** Publish the explicit external-plugin Remote contract beside the Host entry. */
export default defineConfig({
  entry: {
    index: 'lib/types/index.js',
    invariant: 'lib/types/invariant.js',
    remote: 'lib/types/integration/remote-contract.js',
  },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
