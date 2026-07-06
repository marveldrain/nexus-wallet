/**
 * Nexus Wallet desktop shell — Electron main process.
 *
 * Two jobs only:
 *  1. Host the onboarding app's production build (renderer/) in a hardened
 *     BrowserWindow — context isolation on, node integration off, sandboxed
 *     renderer, all navigation and popups locked down, permission requests
 *     denied. The wallet code itself is identical to the web build.
 *  2. Provide OS-secure vault persistence over IPC (Hard Launch Gate #2):
 *     the password-encrypted vault blob is ADDITIONALLY wrapped with
 *     Electron `safeStorage` (DPAPI on Windows, Keychain on macOS,
 *     libsecret on Linux) and written to userData/vault.dat, so the file at
 *     rest is bound to the OS user account — an attacker copying the file
 *     can't even reach the scrypt-protected blob to brute-force offline.
 */
const { app, BrowserWindow, ipcMain, safeStorage, shell, session } = require('electron');
const { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

// One stable userData dir ("Nexus Wallet") whether running `electron .` in
// dev or the packaged app — otherwise the dev shell would read a different
// vault location than the installed app.
app.setPath('userData', path.join(app.getPath('appData'), 'Nexus Wallet'));

// Single instance — a second launch focuses the existing window instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

const INDEX_HTML = path.join(__dirname, 'renderer', 'index.html');

function vaultPath() {
  return path.join(app.getPath('userData'), 'vault.dat');
}

/**
 * Envelope format (JSON, debuggable):
 *   { v: 1, secure: true,  data: <base64 of safeStorage-encrypted blob> }
 *   { v: 1, secure: false, data: <the vault JSON string as-is> }
 * The non-secure form only occurs when the OS keystore is unavailable (some
 * Linux setups) — equivalent protection to the web app's localStorage; the
 * blob inside is always scrypt+XChaCha20-Poly1305 encrypted regardless.
 */
function saveVault(json) {
  const secure = safeStorage.isEncryptionAvailable();
  const envelope = JSON.stringify({
    v: 1,
    secure,
    data: secure ? safeStorage.encryptString(json).toString('base64') : json,
  });
  const file = vaultPath();
  mkdirSync(path.dirname(file), { recursive: true });
  // Atomic-ish write: never leave a half-written vault if we crash mid-save.
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, envelope);
  renameSync(tmp, file);
}

function loadVault() {
  try {
    const file = vaultPath();
    if (!existsSync(file)) return null;
    const envelope = JSON.parse(readFileSync(file, 'utf8'));
    if (envelope?.v !== 1 || typeof envelope.data !== 'string') return null;
    return envelope.secure
      ? safeStorage.decryptString(Buffer.from(envelope.data, 'base64'))
      : envelope.data;
  } catch {
    // Unreadable/corrupt/foreign-user file — treat as "no vault" rather than
    // crashing; the app then shows Welcome and the user restores from seed.
    return null;
  }
}

function clearVault() {
  try {
    rmSync(vaultPath(), { force: true });
  } catch {
    // best-effort
  }
}

// Synchronous IPC on purpose: the renderer decides welcome-vs-unlock at
// startup synchronously, and a vault save must be durably on disk before the
// UI proceeds past wallet creation. One small read/write each — milliseconds.
ipcMain.on('vault:load', (event) => {
  event.returnValue = loadVault();
});
ipcMain.on('vault:save', (event, json) => {
  if (typeof json !== 'string' || json.length > 1_000_000) {
    event.returnValue = false;
    return;
  }
  saveVault(json);
  event.returnValue = true;
});
ipcMain.on('vault:clear', (event) => {
  clearVault();
  event.returnValue = true;
});
ipcMain.on('vault:secure', (event) => {
  event.returnValue = safeStorage.isEncryptionAvailable();
});

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 400,
    minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  // The app is a single local page. Block ALL in-window navigation away from
  // it; anything targeting a new window (explorer links etc.) opens in the
  // system browser — and only over https.
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });

  void win.loadFile(INDEX_HTML);
  return win;
}

app.whenReady().then(() => {
  // A wallet needs no camera/mic/geolocation/etc. Deny every permission request.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => {
    callback(false);
  });

  createWindow();

  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
