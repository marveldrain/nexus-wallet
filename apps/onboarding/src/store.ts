/**
 * Onboarding state machine (Zustand).
 *
 * SECURITY POSTURE for this flow:
 *   - `password` and `mnemonic` live ONLY in memory and are cleared the moment
 *     the encrypted vault is produced.
 *   - The only thing persisted is the encrypted `vault` (scrypt + XChaCha20-
 *     Poly1305), via data/vaultStorage.ts: localStorage on the web, OS-secure
 *     storage (Electron safeStorage/DPAPI) in the desktop shell (apps/desktop).
 *   - The unlocked `keyring` (holding the seed) is kept in memory while the
 *     wallet is UNLOCKED so it can sign transactions — this is the standard
 *     wallet model (MetaMask et al. do the same). It is wiped via
 *     `keyring.lock()` on lock / auto-lock / reset, and freshly-derived private
 *     keys are wiped immediately after each signing operation (see data/send.ts).
 */
import { create } from 'zustand';
import {
  type ChainId,
  type EncryptedVault,
  generateMnemonic,
  importMnemonic,
  isValidMnemonic,
  Keyring,
  revealMnemonic,
  unlockVault,
  DecryptionFailedError,
} from '@nexus/wallet-core';
import type { Portfolio } from '@nexus/portfolio';
import type { WalletTransaction } from '@nexus/chain-rpc';
import { getLivePortfolio, getMockPortfolio } from './data/portfolio';
import { getActivity } from './data/history';
import { getTokens, type TokenPosition } from './data/tokens';
import { addCustomTokenContract, removeCustomTokenContract } from './data/customTokens';
import {
  type Contact,
  type ContactChain,
  loadContacts,
  newContactId,
  saveContacts,
} from './data/contacts';
import {
  addAccount as addAccountMeta,
  loadAccountList,
  renameAccount as renameAccountMeta,
  type WalletAccountMeta,
} from './data/walletAccounts';
import {
  loadAutoLockMinutes,
  loadFiatCurrency,
  loadLockOnBlur,
  loadNetworkMode,
  loadWipeAfterAttempts,
  saveAutoLockMinutes,
  saveFiatCurrency,
  saveLockOnBlur,
  saveNetworkMode,
  saveWipeAfterAttempts,
  type AutoLockMinutes,
  type FiatCurrency,
  type NetworkMode,
  type WipeAfterAttempts,
} from './data/settings';
import { clearVaultJson, loadVaultJson, saveVaultJson } from './data/vaultStorage';
import { USE_LIVE } from './config';

export type Step =
  | 'welcome'
  | 'create-password'
  | 'reveal'
  | 'verify'
  | 'import'
  | 'unlock'
  | 'dashboard'
  | 'send'
  | 'receive'
  | 'activity'
  | 'watch'
  | 'contacts'
  | 'add-token'
  | 'accounts'
  | 'tx-detail'
  | 'settings'
  | 'change-password'
  | 'reveal-seed';

export interface AccountView {
  chain: ChainId;
  name: string;
  ticker: string;
  address: string;
}

const DISPLAY_CHAINS: Array<{ chain: ChainId; name: string; ticker: string }> = [
  { chain: 'bitcoin', name: 'Bitcoin', ticker: 'BTC' },
  { chain: 'ethereum', name: 'Ethereum', ticker: 'ETH' },
  { chain: 'solana', name: 'Solana', ticker: 'SOL' },
];

/**
 * Derive display addresses for one HD account index from an unlocked keyring.
 * Uses `deriveAddress` (not `deriveAccount`) so private keys never materialize
 * here — this runs on every create/import/unlock/account-switch.
 *
 * In testnet mode, Bitcoin derives its separate "tb1…" testnet identity
 * (different keypair, coin type 1' — see wallet-core's
 * `deriveBitcoinTestnetAccount`); Ethereum/Solana reuse the SAME address as
 * mainnet (Sepolia/devnet share the mainnet address format), so only the RPC
 * endpoints they're read through change, handled entirely in the data layer.
 */
function deriveAccounts(
  keyring: Keyring,
  accountIndex: number,
  networkMode: NetworkMode = 'mainnet',
): AccountView[] {
  return DISPLAY_CHAINS.map(({ chain, name, ticker }) => ({
    chain,
    name,
    ticker,
    address:
      chain === 'bitcoin' && networkMode === 'testnet'
        ? keyring.deriveBitcoinTestnetAddress(accountIndex)
        : keyring.deriveAddress(chain, accountIndex),
  }));
}

function loadVault(): EncryptedVault | null {
  try {
    const raw = loadVaultJson();
    return raw ? (JSON.parse(raw) as EncryptedVault) : null;
  } catch {
    return null;
  }
}

interface OnboardingState {
  step: Step;
  password: string;
  /** Optional BIP39 passphrase ("25th word"), transient like the password. */
  passphrase: string;
  mnemonic: string | null;
  vault: EncryptedVault | null;
  /** Unlocked keyring for signing; null while locked or watch-only. */
  keyring: Keyring | null;
  accounts: AccountView[];
  /** Active HD account index (same index used across every chain). */
  accountIndex: number;
  /** All known accounts (index + display name) for this wallet. */
  accountList: WalletAccountMeta[];
  /** When set, the app is in read-only "watch" mode for this address. */
  watchAddress: string | null;
  /** Asset currently focused in the send/receive screens. */
  selectedChain: ChainId;
  portfolio: Portfolio | null;
  valueSeries: number[];
  portfolioLoading: boolean;
  tokens: TokenPosition[];
  tokensUsd: number;
  activity: WalletTransaction[];
  activityLoading: boolean;
  selectedTx: WalletTransaction | null;
  contacts: Contact[];
  fiatCurrency: FiatCurrency;
  /** Mainnet or testnet (Bitcoin testnet3 / Ethereum Sepolia / Solana devnet). */
  networkMode: NetworkMode;
  /** Idle auto-lock timeout in minutes (0 = never). */
  autoLockMinutes: AutoLockMinutes;
  /** Lock immediately when the tab/window is hidden. */
  lockOnBlur: boolean;
  /** Wipe the local vault after this many consecutive failed unlocks (null = disabled). */
  wipeAfterAttempts: WipeAfterAttempts;
  busy: boolean;
  error: string | null;
  /** One-shot informational banner (e.g. shown on Welcome after a panic-wipe). */
  notice: string | null;
  unlockAttempts: number;

  go: (step: Step) => void;
  startCreate: () => void;
  startImport: () => void;
  startWatch: () => void;
  /** Enter read-only mode for an arbitrary address. */
  watch: (chain: ChainId, address: string) => void;
  exitWatch: () => void;
  setPassword: (pw: string) => void;
  setPassphrase: (p: string) => void;
  /** Generate a fresh phrase and advance to the reveal screen. */
  beginReveal: () => void;
  /** Backup verified → encrypt, persist, derive, go to dashboard. */
  finishCreate: () => Promise<void>;
  importPhrase: (phrase: string, password: string, passphrase?: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  /** Load valued balances for the dashboard. */
  loadPortfolio: () => Promise<void>;
  openAccounts: () => void;
  /** Switch the active account (re-derives addresses + reloads balances/activity). */
  switchAccount: (index: number) => void;
  /** Derive a brand-new account (next index) and switch to it. */
  createAccount: (name?: string) => void;
  renameAccount: (index: number, name: string) => void;
  openSend: (chain?: ChainId) => void;
  openReceive: (chain?: ChainId) => void;
  openActivity: () => void;
  loadActivity: () => Promise<void>;
  openTxDetail: (tx: WalletTransaction) => void;
  openContacts: () => void;
  addContact: (label: string, address: string, chain: ContactChain) => void;
  removeContact: (id: string) => void;
  openAddToken: () => void;
  reloadTokens: () => Promise<void>;
  addCustomToken: (contract: string) => Promise<void>;
  removeCustomToken: (contract: string) => Promise<void>;
  setFiatCurrency: (currency: FiatCurrency) => void;
  /** Switch network mode — re-derives the BTC testnet identity if needed and reloads everything. */
  setNetworkMode: (mode: NetworkMode) => void;
  setAutoLockMinutes: (minutes: AutoLockMinutes) => void;
  setLockOnBlur: (enabled: boolean) => void;
  setWipeAfterAttempts: (value: WipeAfterAttempts) => void;
  /** Re-encrypt the vault under a new password (requires the current one). */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Decrypt and return the mnemonic for the reveal-seed screen (requires the current password). */
  revealSeed: (password: string) => Promise<string | null>;
  lock: () => void;
  /** Wipe the stored vault and start over (manual, from Settings/Unlock). */
  reset: () => void;
  clearNotice: () => void;
}

const initialVault = loadVault();

export const useOnboarding = create<OnboardingState>((set, get) => ({
  step: initialVault ? 'unlock' : 'welcome',
  password: '',
  passphrase: '',
  mnemonic: null,
  vault: initialVault,
  keyring: null,
  accounts: [],
  accountIndex: 0,
  accountList: loadAccountList(),
  watchAddress: null,
  selectedChain: 'bitcoin',
  portfolio: null,
  valueSeries: [],
  portfolioLoading: false,
  tokens: [],
  tokensUsd: 0,
  activity: [],
  activityLoading: false,
  selectedTx: null,
  contacts: loadContacts(),
  fiatCurrency: loadFiatCurrency(),
  networkMode: loadNetworkMode(),
  autoLockMinutes: loadAutoLockMinutes(),
  lockOnBlur: loadLockOnBlur(),
  wipeAfterAttempts: loadWipeAfterAttempts(),
  busy: false,
  error: null,
  notice: null,
  unlockAttempts: 0,

  go: (step) => set({ step, error: null, notice: null }),
  clearNotice: () => set({ notice: null }),

  startCreate: () =>
    set({ step: 'create-password', error: null, mnemonic: null, password: '', passphrase: '' }),
  startImport: () => set({ step: 'import', error: null, password: '', passphrase: '' }),
  startWatch: () => set({ step: 'watch', error: null }),

  watch: (chain, address) => {
    const meta = DISPLAY_CHAINS.find((c) => c.chain === chain)!;
    set({
      watchAddress: address,
      accounts: [{ chain, name: meta.name, ticker: meta.ticker, address }],
      keyring: null,
      portfolio: null,
      valueSeries: [],
      tokens: [],
      tokensUsd: 0,
      activity: [],
      selectedChain: chain,
      step: 'dashboard',
      error: null,
    });
    void get().loadPortfolio();
  },

  exitWatch: () =>
    set((s) => ({
      watchAddress: null,
      accounts: [],
      portfolio: null,
      valueSeries: [],
      tokens: [],
      tokensUsd: 0,
      activity: [],
      step: s.vault ? 'unlock' : 'welcome',
      error: null,
    })),

  setPassword: (password) => set({ password }),
  setPassphrase: (passphrase) => set({ passphrase }),

  beginReveal: () => set({ mnemonic: generateMnemonic(256), step: 'reveal', error: null }),

  finishCreate: async () => {
    const { mnemonic, password, passphrase } = get();
    if (!mnemonic) return;
    set({ busy: true, error: null });
    // Yield a frame so the spinner paints before scrypt blocks the thread.
    await new Promise((r) => setTimeout(r, 20));
    try {
      const vault = importMnemonic(mnemonic, password, passphrase);
      saveVaultJson(JSON.stringify(vault));
      const keyring = Keyring.fromMnemonic(mnemonic, passphrase);
      const accounts = deriveAccounts(keyring, 0, get().networkMode);
      set({
        vault,
        keyring,
        accounts,
        accountIndex: 0,
        accountList: loadAccountList(),
        mnemonic: null,
        password: '',
        passphrase: '',
        step: 'dashboard',
        busy: false,
      });
    } catch (err) {
      set({ busy: false, error: messageFrom(err) });
    }
  },

  importPhrase: async (phrase, password, passphrase = '') => {
    set({ busy: true, error: null });
    await new Promise((r) => setTimeout(r, 20));
    try {
      if (!isValidMnemonic(phrase)) {
        set({ busy: false, error: 'That recovery phrase is not valid. Check the words and order.' });
        return;
      }
      const vault = importMnemonic(phrase, password, passphrase);
      saveVaultJson(JSON.stringify(vault));
      const keyring = Keyring.fromMnemonic(phrase, passphrase);
      const accounts = deriveAccounts(keyring, 0, get().networkMode);
      set({
        vault,
        keyring,
        accounts,
        accountIndex: 0,
        accountList: loadAccountList(),
        password: '',
        passphrase: '',
        step: 'dashboard',
        busy: false,
      });
    } catch (err) {
      set({ busy: false, error: messageFrom(err) });
    }
  },

  unlock: async (password) => {
    const { vault, unlockAttempts, wipeAfterAttempts } = get();
    if (!vault) return;
    set({ busy: true, error: null });
    // Exponential backoff after repeated failures (anti-brute-force).
    const delay = unlockAttempts > 0 ? Math.min(2000, 150 * 2 ** unlockAttempts) : 20;
    await new Promise((r) => setTimeout(r, delay));
    try {
      const keyring = unlockVault(vault, password);
      const { accountIndex, networkMode } = get();
      const accounts = deriveAccounts(keyring, accountIndex, networkMode);
      set({
        keyring,
        accounts,
        accountList: loadAccountList(),
        step: 'dashboard',
        busy: false,
        unlockAttempts: 0,
      });
    } catch (err) {
      const attempts = unlockAttempts + 1;
      if (wipeAfterAttempts !== null && attempts >= wipeAfterAttempts) {
        get().reset();
        set({
          notice: `Too many failed unlock attempts — this device's wallet data has been wiped for your protection. Restore from your recovery phrase to continue.`,
        });
        return;
      }
      set({ busy: false, error: messageFrom(err), unlockAttempts: attempts });
    }
  },

  loadPortfolio: async () => {
    const { accounts, fiatCurrency, networkMode, watchAddress } = get();
    // Watch sessions are always mainnet — testnet mode is about THIS wallet's
    // own testnet identity, not a global switch for arbitrary watched addresses.
    const effectiveMode = watchAddress ? 'mainnet' : networkMode;
    set({ portfolioLoading: true });
    try {
      const snapshot = USE_LIVE
        ? await getLivePortfolio(
            accounts.map((a) => ({ chain: a.chain, address: a.address })),
            fiatCurrency,
            effectiveMode,
          )
        : await getMockPortfolio();
      set({
        portfolio: snapshot.portfolio,
        valueSeries: snapshot.valueSeries,
        portfolioLoading: false,
        error: null,
      });
    } catch {
      set({
        portfolioLoading: false,
        error: 'Could not load balances. Check your connection and try again.',
      });
    }

    // Token discovery (live only) — loads independently so it never blocks the
    // native-balance view.
    if (USE_LIVE) {
      void getTokens(
        accounts.map((a) => ({ chain: a.chain, address: a.address })),
        fiatCurrency,
        effectiveMode,
      )
        .then(({ positions, totalUsd }) => set({ tokens: positions, tokensUsd: totalUsd }))
        .catch(() => undefined);
    } else {
      set({ tokens: [], tokensUsd: 0 });
    }
  },

  openAccounts: () => set({ step: 'accounts', error: null, accountList: loadAccountList() }),

  switchAccount: (index) => {
    const { keyring, networkMode } = get();
    if (!keyring) return;
    const accounts = deriveAccounts(keyring, index, networkMode);
    set({
      accountIndex: index,
      accounts,
      step: 'dashboard',
      portfolio: null,
      valueSeries: [],
      tokens: [],
      tokensUsd: 0,
      activity: [],
      error: null,
    });
    void get().loadPortfolio();
  },

  createAccount: (name) => {
    const meta = addAccountMeta(name);
    set({ accountList: loadAccountList() });
    get().switchAccount(meta.index);
  },

  renameAccount: (index, name) => {
    renameAccountMeta(index, name);
    set({ accountList: loadAccountList() });
  },

  openSend: (chain) =>
    set((s) => ({ step: 'send', selectedChain: chain ?? s.selectedChain, error: null })),
  openReceive: (chain) =>
    set((s) => ({ step: 'receive', selectedChain: chain ?? s.selectedChain, error: null })),
  openActivity: () => {
    set({ step: 'activity', error: null });
    void get().loadActivity();
  },
  loadActivity: async () => {
    const { accounts, networkMode, watchAddress } = get();
    const effectiveMode = watchAddress ? 'mainnet' : networkMode;
    set({ activityLoading: true });
    try {
      const activity = await getActivity(
        accounts.map((a) => ({ chain: a.chain, address: a.address })),
        effectiveMode,
      );
      set({ activity, activityLoading: false });
    } catch {
      set({ activityLoading: false });
    }
  },
  openTxDetail: (tx) => set({ selectedTx: tx, step: 'tx-detail', error: null }),

  openAddToken: () => set({ step: 'add-token', error: null }),
  reloadTokens: async () => {
    const { accounts, fiatCurrency, networkMode, watchAddress } = get();
    try {
      const { positions, totalUsd } = await getTokens(
        accounts.map((a) => ({ chain: a.chain, address: a.address })),
        fiatCurrency,
        watchAddress ? 'mainnet' : networkMode,
      );
      set({ tokens: positions, tokensUsd: totalUsd });
    } catch {
      /* keep existing tokens on failure */
    }
  },
  addCustomToken: async (contract) => {
    addCustomTokenContract(contract);
    await get().reloadTokens();
  },
  removeCustomToken: async (contract) => {
    removeCustomTokenContract(contract);
    await get().reloadTokens();
  },

  setFiatCurrency: (currency) => {
    saveFiatCurrency(currency);
    set({ fiatCurrency: currency });
    void get().loadPortfolio();
  },

  setNetworkMode: (mode) => {
    saveNetworkMode(mode);
    const { keyring, accountIndex } = get();
    set({ networkMode: mode });
    if (!keyring) return; // nothing live to re-derive while locked/watching
    const accounts = deriveAccounts(keyring, accountIndex, mode);
    set({
      accounts,
      portfolio: null,
      valueSeries: [],
      tokens: [],
      tokensUsd: 0,
      activity: [],
      error: null,
    });
    void get().loadPortfolio();
  },

  setAutoLockMinutes: (minutes) => {
    saveAutoLockMinutes(minutes);
    set({ autoLockMinutes: minutes });
  },
  setLockOnBlur: (enabled) => {
    saveLockOnBlur(enabled);
    set({ lockOnBlur: enabled });
  },
  setWipeAfterAttempts: (value) => {
    saveWipeAfterAttempts(value);
    set({ wipeAfterAttempts: value });
  },

  changePassword: async (currentPassword, newPassword) => {
    const { vault } = get();
    if (!vault) return;
    set({ busy: true, error: null });
    await new Promise((r) => setTimeout(r, 20));
    try {
      const { mnemonic, passphrase } = revealMnemonic(vault, currentPassword);
      try {
        const newVault = importMnemonic(mnemonic, newPassword, passphrase);
        saveVaultJson(JSON.stringify(newVault));
        set({ vault: newVault, busy: false, notice: 'Password changed.', step: 'settings' });
      } finally {
        // mnemonic/passphrase are local consts here — nothing else retains them.
      }
    } catch (err) {
      const msg =
        err instanceof DecryptionFailedError ? 'Current password is incorrect.' : messageFrom(err);
      set({ busy: false, error: msg });
    }
  },

  revealSeed: async (password) => {
    const { vault } = get();
    if (!vault) return null;
    try {
      const { mnemonic } = revealMnemonic(vault, password);
      return mnemonic;
    } catch {
      return null;
    }
  },

  openContacts: () => set({ step: 'contacts', error: null }),
  addContact: (label, address, chain) =>
    set((s) => {
      const contacts = [...s.contacts, { id: newContactId(), label: label.trim(), address: address.trim(), chain }];
      saveContacts(contacts);
      return { contacts };
    }),
  removeContact: (id) =>
    set((s) => {
      const contacts = s.contacts.filter((c) => c.id !== id);
      saveContacts(contacts);
      return { contacts };
    }),

  lock: () => {
    get().keyring?.lock(); // wipe the seed from memory
    set({
      keyring: null,
      accounts: [],
      portfolio: null,
      valueSeries: [],
      tokens: [],
      tokensUsd: 0,
      activity: [],
      step: 'unlock',
      error: null,
      password: '',
    });
  },

  reset: () => {
    get().keyring?.lock();
    clearVaultJson();
    set({
      step: 'welcome',
      password: '',
      mnemonic: null,
      vault: null,
      keyring: null,
      accounts: [],
      accountIndex: 0,
      accountList: loadAccountList(),
      watchAddress: null,
      portfolio: null,
      valueSeries: [],
      tokens: [],
      tokensUsd: 0,
      activity: [],
      error: null,
      unlockAttempts: 0,
    });
  },
}));

function messageFrom(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}
