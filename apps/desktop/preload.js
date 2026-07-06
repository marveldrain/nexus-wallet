/**
 * Preload bridge — the ONLY surface the renderer gets beyond the web platform.
 * Matches the `DesktopVaultBridge` interface the app consumes in
 * apps/onboarding/src/data/vaultStorage.ts. Synchronous IPC by design (see
 * main.js) — one small round-trip at startup + rare writes.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexusDesktop', {
  vault: {
    load: () => ipcRenderer.sendSync('vault:load'),
    save: (json) => {
      if (ipcRenderer.sendSync('vault:save', json) !== true) {
        throw new Error('Vault save failed.');
      }
    },
    clear: () => ipcRenderer.sendSync('vault:clear'),
    secure: ipcRenderer.sendSync('vault:secure'),
  },
});
