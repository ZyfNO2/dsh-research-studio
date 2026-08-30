import { defineConfig } from 'tsdown'

/** Build every product package without changing the companion DSH checkout. */
export default defineConfig(({ env }) => ({
  workspace: ['packages/*'],
  entry: ['lib/types/{index,invariant}.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  plugins: [],
}))
