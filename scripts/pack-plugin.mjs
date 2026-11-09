#!/usr/bin/env node
/**
 * Build the npm-publishable plugin package from the built lib/.
 *
 * `npm publish dist/<name>-<version>` is the distribution step. The tgz/zip
 * archives and SHA256SUMS are produced for local verification only; GitHub
 * Releases publish notes without binary assets.
 *
 * The repository package cannot be packed as-is:
 * - `private: true` blocks publishing;
 * - `dependencies["@deepseek-teaching/core"]` is a `workspace:*` link that only
 *   resolves inside this workspace.
 * The Host bundle already inlines the teaching core and every pure-JS
 * dependency (see scripts/build-plugin.mjs), so the release manifest drops the
 * workspace dependency entirely and ships only `lib/`, the patch and metadata.
 *
 * Output (gitignored `dist/`):
 *   dist/<name>-<version>/                   package to `npm publish`
 *   dist/<name>-<version>.tgz/.zip           local verification archives
 *   dist/SHA256SUMS                          checksums of the local archives
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const pluginDir = join(root, 'packages/dsh-plugin')
const distDir = join(root, 'dist')
const manifest = JSON.parse(await readFile(join(pluginDir, 'package.json'), 'utf8'))
const version = manifest.version ?? '0.0.0'
const packageName = `${manifest.name}-${version}`
const stage = join(distDir, packageName)

for (const required of ['lib/index.js', 'lib/client.js', 'cordis.patch.yml']) {
  try {
    await access(join(pluginDir, required))
  } catch {
    throw new Error(`missing ${required}; run "node scripts/build-plugin.mjs" first`)
  }
}

await rm(stage, { recursive: true, force: true })
await mkdir(join(stage, 'lib'), { recursive: true })
await cp(join(pluginDir, 'lib/index.js'), join(stage, 'lib/index.js'))
await cp(join(pluginDir, 'lib/client.js'), join(stage, 'lib/client.js'))
await cp(join(pluginDir, 'cordis.patch.yml'), join(stage, 'cordis.patch.yml'))
await cp(join(root, 'README.md'), join(stage, 'README.md'))

/** Release manifest: no private flag, no workspace-only dependencies. */
const releaseManifest = {
  name: manifest.name,
  version,
  type: manifest.type,
  description: manifest.description,
  license: 'MIT',
  repository: manifest.repository,
  main: manifest.main,
  exports: manifest.exports,
  files: ['lib', 'cordis.patch.yml', 'package.json', 'README.md'],
  engines: manifest.engines,
  dsh: manifest.dsh,
}
await writeFile(join(stage, 'package.json'), `${JSON.stringify(releaseManifest, null, 2)}\n`)

const archives = []
const tgz = join(distDir, `${packageName}.tgz`)
await rm(tgz, { force: true })
execFileSync('tar', ['-czf', tgz, '-C', distDir, packageName])
archives.push(tgz)

const zip = join(distDir, `${packageName}.zip`)
await rm(zip, { force: true })
try {
  execFileSync('zip', ['-qr', zip, packageName], { cwd: distDir })
  archives.push(zip)
} catch {
  console.warn('zip is not available; skipping the .zip archive')
}

const lines = []
for (const archive of archives) {
  const digest = createHash('sha256').update(await readFile(archive)).digest('hex')
  lines.push(`${digest}  ${archive.slice(distDir.length + 1)}`)
}
await writeFile(join(distDir, 'SHA256SUMS'), `${lines.join('\n')}\n`)

const sizes = await Promise.all(archives.map(async archive => {
  const bytes = (await readFile(archive)).byteLength
  return `  ${archive.slice(distDir.length + 1)}  ${(bytes / 1024).toFixed(0)} KiB`
}))
console.log(`packed ${packageName} (${version})`)
for (const line of sizes) console.log(line)
console.log(`  SHA256SUMS`)
