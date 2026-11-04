#!/usr/bin/env node
/**
 * Scan one standalone offline export and report whether it is self-contained.
 *
 * Usage:
 *   node packages/teaching-core/tests/portability/offline-scan.ts /tmp/t07-demo/export/index.html
 *
 * Exit code 0 = no external resource reference, manifest complete, every
 * checksum matching. Exit code 1 = at least one problem (printed as JSON).
 * This is a Node-side audit; it does not replace real browser/offline testing.
 */
import { auditOfflineExport, auditPassed } from './offline-audit.ts'

const htmlPath = process.argv[2]
if (htmlPath === undefined || htmlPath.trim() === '') {
  console.error('usage: node packages/teaching-core/tests/portability/offline-scan.ts <index.html>')
  process.exit(2)
}
const report = await auditOfflineExport(htmlPath)
const passed = auditPassed(report)
console.log(JSON.stringify({ passed, ...report }, null, 2))
process.exit(passed ? 0 : 1)
