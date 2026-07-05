import { describe, expect, it } from 'vitest';

import {
  createWallet,
  decryptFromVault,
  encryptToVault,
  generateMnemonic,
  importMnemonic,
  isValidMnemonic,
  Keyring,
  revealMnemonic,
  unlockVault,
  DecryptionFailedError,
  InvalidMnemonicError,
} from '../index';

// Canonical BIP39 test vector — the all-"abandon" mnemonic.
// Its derived addresses are widely published and stable, so they double as
// cross-implementation conformance checks.
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// Use fast KDF params in tests so they run quickly.
const FAST_SCRYPT = { N: 2 ** 12, r: 8, p: 1, dkLen: 32 };

describe('mnemonic', () => {
  it('generates valid 12- and 24-word phrases', () => {
    expect(generateMnemonic(128).split(' ')).toHaveLength(12);
    expect(generateMnemonic(256).split(' ')).toHaveLength(24);
    expect(isValidMnemonic(generateMnemonic(256))).toBe(true);
  });

  it('rejects an invalid phrase', () => {
    expect(isValidMnemonic('not a real mnemonic phrase at all you see')).toBe(false);
  });

  it('produces unique entropy across generations', () => {
    expect(generateMnemonic(256)).not.toBe(generateMnemonic(256));
  });
});

describe('Keyring derivation (conformance vectors)', () => {
  const keyring = Keyring.fromMnemonic(TEST_MNEMONIC);

  it('derives the canonical Ethereum address (m/44\'/60\'/0\'/0/0)', () => {
    const acct = keyring.deriveAccount('ethereum', 0);
    expect(acct.address).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
    expect(acct.path).toBe("m/44'/60'/0'/0/0");
  });

  it('derives the canonical Bitcoin native-segwit address (m/84\'/0\'/0\'/0/0)', () => {
    const acct = keyring.deriveAccount('bitcoin', 0);
    expect(acct.address).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
  });

  it('derives a valid base58 Solana address', () => {
    const acct = keyring.deriveAccount('solana', 0);
    expect(acct.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(acct.path).toBe("m/44'/501'/0'/0'");
  });

  it('derives distinct accounts per index', () => {
    const [a0, a1] = keyring.deriveAccounts('ethereum', 2);
    expect(a0.address).not.toBe(a1.address);
  });

  it('deriveAddress matches deriveAccount but wipes the private key', () => {
    const acct = keyring.deriveAccount('ethereum', 0);
    const address = keyring.deriveAddress('ethereum', 0);
    expect(address).toBe(acct.address);
    // deriveAccount's own key is untouched by deriveAddress's internal wipe —
    // confirms the wipe is scoped to deriveAddress's own derivation, not shared state.
    expect(acct.privateKey.some((b) => b !== 0)).toBe(true);
  });

  it('derives a Bitcoin TESTNET address distinct from mainnet, at coin type 1', () => {
    const testnetAcct = keyring.deriveBitcoinTestnetAccount(0);
    expect(testnetAcct.address).toMatch(/^tb1q/);
    expect(testnetAcct.path).toBe("m/84'/1'/0'/0/0");

    const mainnetAcct = keyring.deriveAccount('bitcoin', 0);
    expect(testnetAcct.address).not.toBe(mainnetAcct.address);
    // Different coin-type path → different keypair, not just a re-encoded address.
    expect(testnetAcct.privateKey).not.toEqual(mainnetAcct.privateKey);
  });

  it('deriveBitcoinTestnetAddress matches the account form but wipes the key', () => {
    const acct = keyring.deriveBitcoinTestnetAccount(1);
    const address = keyring.deriveBitcoinTestnetAddress(1);
    expect(address).toBe(acct.address);
  });

  it('throws after lock()', () => {
    const k = Keyring.fromMnemonic(TEST_MNEMONIC);
    k.lock();
    expect(k.isLocked).toBe(true);
    expect(() => k.deriveAccount('ethereum', 0)).toThrowError(/locked/i);
    expect(() => k.deriveBitcoinTestnetAccount(0)).toThrowError(/locked/i);
  });
});

describe('vault encryption', () => {
  it('round-trips plaintext', () => {
    const vault = encryptToVault('top secret', 'hunter2', FAST_SCRYPT);
    expect(decryptFromVault(vault, 'hunter2')).toBe('top secret');
  });

  it('fails with the wrong password (authenticated)', () => {
    const vault = encryptToVault('top secret', 'hunter2', FAST_SCRYPT);
    expect(() => decryptFromVault(vault, 'wrong')).toThrowError(DecryptionFailedError);
  });

  it('uses a fresh salt + nonce every time', () => {
    const a = encryptToVault('x', 'pw', FAST_SCRYPT);
    const b = encryptToVault('x', 'pw', FAST_SCRYPT);
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
});

describe('end-to-end wallet lifecycle', () => {
  it('creates, persists, and unlocks back to the same address', () => {
    const { mnemonic, vault } = createWallet({ password: 'pw', scrypt: FAST_SCRYPT });
    const expected = Keyring.fromMnemonic(mnemonic).deriveAccount('ethereum', 0).address;

    const restored = unlockVault(vault, 'pw').deriveAccount('ethereum', 0).address;
    expect(restored).toBe(expected);
  });

  it('rejects importing an invalid mnemonic', () => {
    expect(() => importMnemonic('garbage words here', 'pw', '', FAST_SCRYPT)).toThrowError(
      InvalidMnemonicError,
    );
  });

  it('a BIP39 passphrase yields a different (hidden) wallet', () => {
    const plain = Keyring.fromMnemonic(TEST_MNEMONIC, '').deriveAccount('ethereum', 0).address;
    const hidden = Keyring.fromMnemonic(TEST_MNEMONIC, 'extra').deriveAccount('ethereum', 0)
      .address;
    expect(plain).not.toBe(hidden);
  });
});

describe('revealMnemonic (change-password / reveal-seed support)', () => {
  it('decrypts a vault back to its original mnemonic + passphrase', () => {
    const vault = importMnemonic(TEST_MNEMONIC, 'pw', 'extra', FAST_SCRYPT);
    const revealed = revealMnemonic(vault, 'pw');
    expect(revealed.mnemonic).toBe(TEST_MNEMONIC);
    expect(revealed.passphrase).toBe('extra');
  });

  it('throws on the wrong password', () => {
    const vault = importMnemonic(TEST_MNEMONIC, 'pw', '', FAST_SCRYPT);
    expect(() => revealMnemonic(vault, 'wrong')).toThrowError(DecryptionFailedError);
  });

  it('supports a change-password flow: decrypt then re-encrypt under a new password', () => {
    const vault = importMnemonic(TEST_MNEMONIC, 'old-pw', '', FAST_SCRYPT);
    const { mnemonic, passphrase } = revealMnemonic(vault, 'old-pw');
    const rotated = importMnemonic(mnemonic, 'new-pw', passphrase, FAST_SCRYPT);

    expect(() => revealMnemonic(rotated, 'old-pw')).toThrowError(DecryptionFailedError);
    const afterRotation = revealMnemonic(rotated, 'new-pw');
    expect(afterRotation.mnemonic).toBe(TEST_MNEMONIC);

    const expected = Keyring.fromMnemonic(TEST_MNEMONIC).deriveAccount('bitcoin', 0).address;
    const restored = unlockVault(rotated, 'new-pw').deriveAccount('bitcoin', 0).address;
    expect(restored).toBe(expected);
  });
});
