#!/usr/bin/env node
/**
 * Build the installable teaching plugin bundle.
 *
 * Produces:
 *   packages/dsh-plugin/lib/index.js   Host entry (Node ESM, core inlined)
 *   packages/dsh-plugin/lib/client.js  Browser half wrapped for the Harness
 *                                      ModuleLoader (external: react/jsx-runtime)
 *
 * The Host bundle keeps only node builtins external: the teaching core and any
 * pure-JS dependency are inlined so a linked install into a profile needs no
 * dependency resolution beyond the Harness runtime itself.
 */
import { build } from 'esbuild'
import { access, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const pluginDir = join(root, 'packages/dsh-plugin')
const libDir = join(pluginDir, 'lib')
const manifest = JSON.parse(await readFile(join(pluginDir, 'package.json'), 'utf8'))
const version = manifest.version ?? '0.0.0'

await mkdir(libDir, { recursive: true })

const shared = {
  bundle: true,
  logLevel: 'warning',
  minify: false,
}

// ---------------------------------------------------------------------------
// Host face: Node ESM, every node builtin stays external.
// ---------------------------------------------------------------------------
await build({
  ...shared,
  entryPoints: [join(pluginDir, 'src/host/index.ts')],
  outfile: join(libDir, 'index.js'),
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: 'linked',
  external: ['node:*'],
  banner: {
    js: `// ${manifest.name} v${version} — Host half. Built for DeepSeek Harness 0.2.2-rc.1.`,
  },
})

// ---------------------------------------------------------------------------
// Browser face: Harness client module format. Factory body is CJS; the shell
// seeds React into the injected require.
// ---------------------------------------------------------------------------
const clientEntry = join(pluginDir, 'src/client/index.tsx')
let hasClient = true
try {
  await access(clientEntry)
} catch {
  hasClient = false
}

if (hasClient) {
  const clientBuild = await build({
    ...shared,
    entryPoints: [clientEntry],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'browser',
    target: 'chrome140',
    jsx: 'automatic',
    sourcemap: false,
    external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
    loader: { '.css': 'text' },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  })
  const body = clientBuild.outputFiles[0]?.text ?? ''
  const sourceMap = clientBuild.outputFiles.find(file => file.path.endsWith('.map'))?.text
  const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(manifest.name)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${body.split('\n').map(line => (line === '' ? line : `    ${line}`)).join('\n')}
    return module.exports;
  },
});
${sourceMap === undefined ? '' : `//# sourceMappingURL=client.js.map\n`}`
  await writeFile(join(libDir, 'client.js'), wrapped)
  if (sourceMap !== undefined) await writeFile(join(libDir, 'client.js.map'), sourceMap)
  console.log(`built client: lib/client.js (${(wrapped.length / 1024).toFixed(1)} KiB)`)
} else {
  console.log('client entry not present yet; skipped lib/client.js')
}

// ---------------------------------------------------------------------------
// Package files the profile loader needs beside the runtime entries.
// ---------------------------------------------------------------------------
await copyFile(join(pluginDir, 'cordis.patch.yml'), join(libDir, 'cordis.patch.yml'))
console.log(`built host: lib/index.js — ${manifest.name} v${version}`)
