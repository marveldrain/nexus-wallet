// Systematic guard for Hard Launch Gate #3 ("no secrets in logs"). Phase 2's
// memory-hygiene review only spot-checked this by eye; this script makes it
// a repeatable, CI-enforced check instead of a one-time human pass.
//
// Scans PRODUCTION source only (packages/*/src, apps/*/src — explicitly
// excluding __tests__/*.test.ts/e2e/*, since those never ship and "seed" is
// legitimately a PRNG-seed parameter name there, not a wallet secret) for any
// console.* call whose argument list mentions a secret-shaped identifier:
// mnemonic, passphrase, privateKey, seed, password, secretKey. A real hit
// means a secret value (or something built from one) would print to the
// browser console / a log aggregator in production.
//
//   node scripts/check-no-secret-logs.mjs
//
// Exits non-zero on any finding. False positive? Wrap the specific line with
// `// nexus-allow-secret-log: <reason>` on the line above the console.* call.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SECRET_PATTERN = /\b(mnemonic|passphrase|privateKey|seed|password|secretKey)\b/i;
const ROOTS = ['packages', 'apps'];
const EXCLUDE_DIR_SEGMENTS = new Set(['node_modules', 'dist', '__tests__', 'e2e', '.turbo']);

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIR_SEGMENTS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')) {
      out.push(full);
    }
  }
}

/** Extracts the full `console.xxx( ... )` call text, balancing parens/braces/strings. */
function extractCalls(source) {
  const calls = [];
  const callStart = /console\.\w+\s*\(/g;
  let m;
  while ((m = callStart.exec(source))) {
    let depth = 1;
    let i = m.index + m[0].length;
    let inString = null;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (inString) {
        if (ch === '\\') i++; // skip escaped char
        else if (ch === inString) inString = null;
      } else if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
      } else if (ch === '(') {
        depth++;
      } else if (ch === ')') {
        depth--;
      }
      i++;
    }
    const lineNumber = source.slice(0, m.index).split('\n').length;
    calls.push({ text: source.slice(m.index, i), line: lineNumber });
  }
  return calls;
}

function allowedByComment(source, lineNumber) {
  const lines = source.split('\n');
  const prev = lines[lineNumber - 2] ?? '';
  return /nexus-allow-secret-log/.test(prev);
}

let files = [];
for (const root of ROOTS) {
  for (const pkgDir of readdirSync(root)) {
    const srcDir = join(root, pkgDir, 'src');
    try {
      walk(srcDir, files);
    } catch {
      // no src/ dir — skip
    }
  }
}

let findings = 0;
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const call of extractCalls(source)) {
    if (SECRET_PATTERN.test(call.text) && !allowedByComment(source, call.line)) {
      findings++;
      console.log(`❌ ${file}:${call.line} — console call references a secret-shaped identifier:`);
      console.log(`   ${call.text.split('\n')[0].slice(0, 120)}${call.text.includes('\n') ? ' …' : ''}`);
    }
  }
}

if (findings === 0) {
  console.log(`✅ No secret-bearing console calls found across ${files.length} production source files.`);
} else {
  console.log(`\n${findings} finding(s). If this is a false positive, add "// nexus-allow-secret-log: <reason>" on the line above.`);
}
process.exit(findings === 0 ? 0 : 1);
