import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// @solana/web3.js and some HD-derivation deps assume Node globals (Buffer,
// process, crypto). Real production crypto web apps polyfill these in the
// browser — we do the same so all three chains derive client-side.
export default defineConfig({
  // Relative asset paths so the SAME build works on a web origin AND from
  // file:// inside the Electron desktop shell (apps/desktop). Safe here:
  // navigation is state-based (no URL routing), so no path-depth issues.
  base: './',
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, process: true, global: true },
      protocolImports: true,
    }),
  ],
  resolve: { preserveSymlinks: true },
  server: { host: true },
});
