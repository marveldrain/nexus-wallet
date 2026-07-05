// Generates a CycloneDX Software Bill of Materials (SBOM) for every package —
// one combined json per package, since each has its own node_modules (npm
// install per-package is how this monorepo actually works; see CI). Useful
// for security review, license auditing, and is increasingly expected before
// shipping a wallet that handles real funds (Phase 2 supply-chain item).
//
//   node scripts/generate-sbom.mjs            (writes sbom/<package>.json)
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PACKAGES = [
  'packages/wallet-core',
  'packages/tx-builder',
  'packages/chain-rpc',
  'packages/portfolio',
  'apps/onboarding',
];

mkdirSync('sbom', { recursive: true });

for (const pkg of PACKAGES) {
  const name = pkg.split('/').pop();
  const outFile = `../../sbom/${name}.json`;
  console.log(`Generating SBOM for ${pkg}...`);
  // --ignore-npm-errors: `npm ls` flags our intentional `overrides` pin (the
  // ws DoS fix, see LAUNCH_CHECKLIST.md Phase 2) as "invalid" because it
  // naively checks the override against the original pre-override semver
  // range — that's the override working as intended, not a real problem.
  execSync(
    `npx --yes @cyclonedx/cyclonedx-npm --ignore-npm-errors --output-format json --output-file ${outFile}`,
    { cwd: pkg, stdio: 'inherit' },
  );
}

console.log('\nDone. SBOMs written to ./sbom/*.json');
