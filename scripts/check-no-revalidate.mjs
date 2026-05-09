#!/usr/bin/env node
// Regression check for the 2026-05-09 audit (HEARTH-A: H1, H2, H3, H12).
//
// Halseth state is live (sessions, SOMA, growth, drift). Any cached fetch leaks
// stale companion mind-shape into the dashboard. The banned pattern from the
// prod incident is `next: { revalidate: N }` against Halseth endpoints. All such
// fetches must use `cache: 'no-store'`.
//
// Run via: node scripts/check-no-revalidate.mjs
// CI usage: chain into build, exit 1 on any find.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const repoRoot   = dirname(__dirname);

const SCAN_DIRS  = ['app', 'lib', 'components'];
const SKIP_DIRS  = new Set(['node_modules', '.next', 'dist']);
const SCAN_EXT   = new Set(['.ts', '.tsx']);
const BAD_RE     = /next\s*:\s*\{\s*revalidate/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (SCAN_EXT.has(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

const offenders = [];
for (const d of SCAN_DIRS) {
  const root = join(repoRoot, d);
  for (const file of walk(root)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (BAD_RE.test(line)) offenders.push({ file, line: i + 1, src: line.trim() });
    });
  }
}

if (offenders.length === 0) {
  console.log('✓ no banned `next: { revalidate ... }` pattern found in app/ lib/ components/');
  process.exit(0);
}

console.error(`✗ found ${offenders.length} banned cache pattern(s):`);
for (const o of offenders) {
  console.error(`  ${o.file}:${o.line}  ${o.src}`);
}
console.error('');
console.error('Halseth fetches must use `cache: \'no-store\'` (see lib/halseth.ts H1 / CLAUDE.md).');
process.exit(1);
