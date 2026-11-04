/**
 * Environment directory shown to the client: builtin rows come from the frozen
 * registry, extended rows from the manager's persisted records/probes, and the
 * gaps list states costs instead of promising success.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shellAdapter, withContext } from './helpers.ts'

test('directory lists the three builtin languages plus the extended catalog', async () => {
  await withContext(async ({ manager }) => {
    const directory = await manager.directory()
    const languages = directory.supportedLanguages.map(row => row.language)
    for (const expected of ['python', 'javascript', 'scheme', 'ruby', 'lua', 'deno']) {
      assert.ok(languages.includes(expected), `directory mentions ${expected}`)
    }
    for (const row of directory.supportedLanguages) {
      assert.ok(['ready', 'missing', 'preparing', 'failed', 'needs-approval'].includes(row.status))
      assert.ok(typeof row.label === 'string' && row.label.length > 0)
    }
    // Builtin records are always listed by the registry.
    for (const expected of ['python', 'javascript', 'scheme']) {
      assert.ok(directory.environments.some(record => record.language === expected))
    }
    const gapText = directory.gaps.join('\n')
    assert.match(gapText, /系统级安装与联网依赖安装不会自动执行/u)
    assert.match(gapText, /没有 CPU\/内存配额/u)
    assert.match(gapText, /网络可达性未探测/u)
    assert.match(gapText, /降规模\/模拟替代/u)
  })
})

test('directory reflects prepared and failed extended environments', async () => {
  const good = shellAdapter({ language: 't06-dir-good', smokeProgram: 'printf "42\\n"\n' })
  const bad = shellAdapter({ language: 't06-dir-bad', smokeProgram: 'exit 3\n' })
  await withContext(async ({ manager }) => {
    const ready = await manager.prepare({ language: 't06-dir-good' })
    const failed = await manager.prepare({ language: 't06-dir-bad' })
    assert.equal(ready.ok && ready.value.status, 'ready')
    assert.equal(failed.ok && failed.value.status, 'failed')
    const directory = await manager.directory()
    const goodRow = directory.supportedLanguages.find(row => row.language === 't06-dir-good')
    assert.equal(goodRow?.status, 'ready')
    assert.ok(goodRow?.environmentId !== undefined)
    const badRow = directory.supportedLanguages.find(row => row.language === 't06-dir-bad')
    assert.equal(badRow?.status, 'failed')
    assert.match(badRow?.note ?? '', /上次准备失败/u)
    assert.ok(directory.environments.some(record => record.language === 't06-dir-good' && record.status === 'ready'))
    assert.ok(directory.environments.some(record => record.language === 't06-dir-bad' && record.status === 'failed'))
    assert.match(directory.gaps.join('\n'), /存在准备失败\/取消的环境记录：t06-dir-bad/u)
  }, { adapters: [good, bad] })
})
