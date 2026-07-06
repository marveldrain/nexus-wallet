// End-to-end verification of the desktop shell using Playwright's Electron
// driver. Proves the four things that make the desktop build worth shipping:
//   1. The packaged renderer loads and the REAL wallet flow works (create).
//   2. The vault is persisted via OS-secure storage (safeStorage/DPAPI), NOT
//      localStorage — and the on-disk file does not contain the vault blob
//      in readable form.
//   3. A relaunch sees the vault (unlock screen) and the password unlocks it
//      back to the same wallet — the full DPAPI round-trip.
//   4. The renderer is actually hardened (no `require`, no `process`).
//
//   node test-desktop.mjs                 (tests dev shell: electron .)
//   node test-desktop.mjs --packaged      (tests release/win-unpacked exe)
import { createRequire } from 'node:module';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// Reuse the onboarding app's Playwright install (already downloaded there).
const { _electron } = require('../onboarding/node_modules/playwright/index.js');

const here = path.dirname(fileURLToPath(import.meta.url));
const packaged = process.argv.includes('--packaged');
const PASSWORD = 'Sup3r$ecretPhrase!2026';

// Isolated userData for the whole run: tests must never read, overwrite, or
// delete a REAL user's vault in %APPDATA%/Nexus Wallet, and must not collide
// with a running instance's single-instance lock (both are per-userData-dir).
const TEST_USER_DATA = path.join(here, '.test-userdata');

function assert(cond, label) {
  if (!cond) {
    console.error(`❌ ${label}`);
    process.exit(1);
  }
  console.log(`✅ ${label}`);
}

async function launch() {
  const isolation = `--nexus-user-data=${TEST_USER_DATA}`;
  if (packaged) {
    const exe = path.join(here, 'release', 'win-unpacked', 'Nexus Wallet.exe');
    if (!existsSync(exe)) {
      console.error(`Packaged exe not found at ${exe} — run \`npm run dist\` first.`);
      process.exit(1);
    }
    return _electron.launch({ executablePath: exe, args: [isolation] });
  }
  return _electron.launch({
    args: [here, isolation],
    executablePath: path.join(here, 'node_modules', 'electron', 'dist', 'electron.exe'),
  });
}

// --- Session 1: fresh app, create a wallet -----------------------------------
rmSync(TEST_USER_DATA, { recursive: true, force: true }); // clean slate

let app = await launch();
let win = await app.firstWindow();
await win.waitForLoadState('domcontentloaded');

const userData = await app.evaluate(({ app: a }) => a.getPath('userData'));
assert(userData === TEST_USER_DATA, `tests run against the ISOLATED userData dir (${userData})`);
const vaultFile = path.join(userData, 'vault.dat');

assert((await win.title()) === 'Nexus Wallet', 'window loads with the right title');

const hardening = await win.evaluate(() => ({
  bridge: typeof window.nexusDesktop?.vault?.load === 'function',
  secure: window.nexusDesktop?.vault?.secure === true,
  noRequire: typeof window.require === 'undefined',
  noProcess: typeof window.process === 'undefined',
}));
assert(hardening.bridge, 'preload bridge (nexusDesktop.vault) is exposed');
assert(hardening.secure, 'OS keystore (safeStorage/DPAPI) reports available');
assert(hardening.noRequire && hardening.noProcess, 'renderer is sandboxed (no require/process)');

// Drive the real create-wallet flow (same steps as the web E2E suite).
await win.getByRole('button', { name: 'Create a new wallet' }).click();
await win.getByPlaceholder('At least 8 characters').fill(PASSWORD);
await win.getByPlaceholder('Re-enter your password').fill(PASSWORD);
await win.getByRole('checkbox').check();
await win.getByRole('button', { name: 'Continue' }).click();
await win.getByRole('button', { name: /Tap to reveal/ }).click();
const words = await win.locator('.grid > div span.font-medium').allTextContents();
assert(words.length === 24, 'real 24-word phrase generated');
await win.getByRole('checkbox').check();
await win.getByRole('button', { name: 'Continue' }).click();
for (const challenge of await win.locator('.space-y-5 > div').all()) {
  const label = await challenge.locator('p').textContent();
  const position = parseInt((label ?? '').replace(/\D/g, ''), 10);
  await challenge.getByRole('button', { name: words[position - 1], exact: true }).click();
}
await win.getByRole('button', { name: 'Create wallet' }).click();
await win.getByText('TOTAL BALANCE').waitFor({ timeout: 20_000 });
assert(true, 'wallet created through the real UI (scrypt + BIP39 for real)');

await win.getByRole('button', { name: 'Receive' }).first().click();
const address1 = await win.getByText(/^bc1[a-z0-9]+$/).textContent();
assert(/^bc1q/.test(address1 ?? ''), `real BTC address derived (${address1?.slice(0, 12)}…)`);

// Copy-to-clipboard regression check (user-reported bug: the shell's
// deny-all permission handler silently blocked clipboard-sanitized-write,
// so navigator.clipboard.writeText rejected and copy did nothing).
await app.evaluate(({ clipboard }) => clipboard.writeText('SENTINEL-BEFORE-COPY'));
await win.getByText(/^bc1[a-z0-9]+$/).click();
await win.waitForTimeout(400);
const clipboardText = await app.evaluate(({ clipboard }) => clipboard.readText());
assert(clipboardText === address1, 'clicking the address copies it to the OS clipboard');

// --- Storage assertions -------------------------------------------------------
const inLocalStorage = await win.evaluate(() => localStorage.getItem('nexus.vault.v1'));
assert(inLocalStorage === null, 'vault is NOT in localStorage');

assert(existsSync(vaultFile), `vault.dat exists on disk (${vaultFile})`);
const raw = readFileSync(vaultFile, 'utf8');
const envelope = JSON.parse(raw);
assert(envelope.v === 1 && envelope.secure === true, 'vault envelope says OS-secure');
assert(
  !raw.includes('ciphertext') && !raw.includes('kdf') && !raw.includes('scrypt'),
  'vault JSON structure is NOT readable in the file (DPAPI-wrapped)',
);

await app.close();

// --- Session 2: relaunch, unlock, same wallet ---------------------------------
app = await launch();
win = await app.firstWindow();
await win.waitForLoadState('domcontentloaded');

await win.getByText('Welcome back').waitFor({ timeout: 10_000 });
assert(true, 'relaunch sees the persisted vault (unlock screen)');

await win.getByPlaceholder('Your device password').fill('wrong-password');
await win.getByRole('button', { name: 'Unlock' }).click();
await win.getByText(/incorrect|tampered/i).waitFor({ timeout: 10_000 });
assert(true, 'wrong password rejected');

await win.getByPlaceholder('Your device password').fill(PASSWORD);
await win.getByRole('button', { name: 'Unlock' }).click();
await win.getByText('TOTAL BALANCE').waitFor({ timeout: 20_000 });
await win.getByRole('button', { name: 'Receive' }).first().click();
const address2 = await win.getByText(/^bc1[a-z0-9]+$/).textContent();
assert(address1 === address2, 'unlock restores the SAME wallet through the DPAPI round-trip');

await app.close();
rmSync(TEST_USER_DATA, { recursive: true, force: true }); // no test data left behind
console.log(`\n✅ All desktop checks passed (${packaged ? 'packaged exe' : 'dev shell'}).`);
