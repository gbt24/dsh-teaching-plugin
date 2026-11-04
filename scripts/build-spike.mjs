#!/usr/bin/env node
/**
 * Build the T00 spike bundle: a Node-ESM Host face and a loader-factory browser bundle.
 *
 * The browser artifact follows the dsh client-module format: a script that calls
 * `window.__ModuleLoader__.load({ id, factory })`, where the factory body is a
 * CommonJS module whose bare imports are satisfied by the injected require.
 */
import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const packageDir = join(root, 'spikes/desktop/minimal-bundle')
const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))

/** Modules the shell seeds into the browser module table (see client/web/src/platform.ts). */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  'zod', '@tanstack/react-virtual',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

await mkdir(join(packageDir, 'lib'), { recursive: true })

// Host face: plain Node ESM, every bare import resolved by the running runtime.
await build({
  entryPoints: [join(packageDir, 'src/host/index.ts')],
  outfile: join(packageDir, 'lib/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  external: ['node:*'],
  logLevel: 'warning',
})

// Browser face: CJS module body wrapped in the ModuleLoader factory handoff.
const clientBuild = await build({
  entryPoints: [join(packageDir, 'src/client/index.tsx')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'chrome140',
  jsx: 'automatic',
  external: PLATFORM_MODULES,
  loader: { '.css': 'text' },
  logLevel: 'warning',
})
const body = clientBuild.outputFiles[0].text
const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(manifest.name)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${body.split('\n').map(line => line === ' ' || line === '' ? line : `    ${line}`).join('\n')}
    return module.exports;
  },
});
`
await writeFile(join(packageDir, 'lib/client.js'), wrapped)
console.log(`built ${manifest.name}: lib/index.js, lib/client.js`)
