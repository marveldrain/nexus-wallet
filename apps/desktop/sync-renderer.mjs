// Copies the onboarding app's production build into ./renderer, which is what
// main.js serves and electron-builder packages. Build apps/onboarding first:
//   cd ../onboarding && npm run build
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..', 'onboarding', 'dist');
const dest = path.join(here, 'renderer');

if (!existsSync(path.join(src, 'index.html'))) {
  console.error(`No build found at ${src} — run \`npm run build\` in apps/onboarding first.`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied ${src} -> ${dest}`);
