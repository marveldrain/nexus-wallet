import { Transaction } from '@solana/web3.js';
import { recoverTransactionAddress } from 'viem';
import { Keyring } from '@nexus/wallet-core';
import { base64, hex } from '@scure/base';
import * as btcSigner from '@scure/btc-signer';
import { describe, expect, it } from 'vitest';

import {
  buildAndSignBtcTransfer,
  buildAndSignEvmTransfer,
  buildAndSignSolTransfer,
  InsufficientFundsError,
  InvalidAmountError,
  parseBtcToSats,
  parseDecimalToBaseUnits,
  parseEvmAmount,
  parseSolToLamports,
  type BtcUtxo,
} from '../index';

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const keyring = Keyring.fromMnemonic(TEST_MNEMONIC);
const eth = keyring.deriveAccount('ethereum', 0);
const btc = keyring.deriveAccount('bitcoin', 0);
const sol = keyring.deriveAccount('solana', 0);
const btcTestnet = keyring.deriveBitcoinTestnetAccount(0);

describe('amount parsing (no floats — bigint base units)', () => {
  it('parses each chain to its smallest unit', () => {
    expect(parseEvmAmount('1')).toBe(10n ** 18n);
    expect(parseEvmAmount('0.5')).toBe(5n * 10n ** 17n);
    expect(parseBtcToSats('0.0001')).toBe(10_000n);
    expect(parseSolToLamports('1.5')).toBe(1_500_000_000n);
  });

  it('rejects garbage and zero', () => {
    expect(() => parseBtcToSats('abc')).toThrow();
    expect(() => parseSolToLamports('0')).toThrow();
    expect(() => parseBtcToSats('0.000000001')).toThrow(); // > 8 dp
  });
});

describe('Ethereum signing (recovers to the signer)', () => {
  it('signs an EIP-1559 transfer that recovers to the derived address', async () => {
    const signed = await buildAndSignEvmTransfer({
      privateKey: eth.privateKey,
      to: '0x000000000000000000000000000000000000dEaD',
      value: parseEvmAmount('0.01'),
      chainId: 1,
      nonce: 0,
      gas: 21_000n,
      maxFeePerGas: 30_000_000_000n,
      maxPriorityFeePerGas: 1_500_000_000n,
    });

    expect(signed.from).toBe(eth.address);
    expect(signed.serialized.startsWith('0x02')).toBe(true); // typed EIP-1559 tx

    const recovered = await recoverTransactionAddress({
      serializedTransaction: signed.serialized,
    });
    expect(recovered).toBe(eth.address);
  });
});

describe('Bitcoin signing (finalize validates the signature)', () => {
  const utxos = [{ txid: 'a'.repeat(64), vout: 0, value: 200_000n }];

  it('builds, signs, and finalizes a P2WPKH spend', () => {
    const signed = buildAndSignBtcTransfer({
      privateKey: btc.privateKey,
      publicKey: btc.publicKey,
      utxos,
      toAddress: btc.address,
      amount: 50_000n,
      feeRate: 12,
      changeAddress: btc.address,
    });

    expect(signed.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(signed.hex).toMatch(/^[0-9a-f]+$/);
    expect(signed.fee).toBeGreaterThan(0n);
    expect(signed.vsize).toBeGreaterThan(0);
  });

  it('throws when funds cannot cover amount + fee', () => {
    expect(() =>
      buildAndSignBtcTransfer({
        privateKey: btc.privateKey,
        publicKey: btc.publicKey,
        utxos: [{ txid: 'b'.repeat(64), vout: 0, value: 1_000n }],
        toAddress: btc.address,
        amount: 50_000n,
        feeRate: 12,
        changeAddress: btc.address,
      }),
    ).toThrow(InsufficientFundsError);
  });

  it('builds, signs, and finalizes a TESTNET P2WPKH spend (tb1... encoding)', () => {
    expect(btcTestnet.address).toMatch(/^tb1q/);
    const signed = buildAndSignBtcTransfer({
      privateKey: btcTestnet.privateKey,
      publicKey: btcTestnet.publicKey,
      utxos: [{ txid: 'c'.repeat(64), vout: 0, value: 200_000n }],
      toAddress: btcTestnet.address,
      amount: 50_000n,
      feeRate: 8,
      changeAddress: btcTestnet.address,
      network: 'testnet',
    });

    expect(signed.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(signed.fee).toBeGreaterThan(0n);
  });

  it('rejects a testnet address encoded against the mainnet network', () => {
    expect(() =>
      buildAndSignBtcTransfer({
        privateKey: btcTestnet.privateKey,
        publicKey: btcTestnet.publicKey,
        utxos: [{ txid: 'd'.repeat(64), vout: 0, value: 200_000n }],
        toAddress: btcTestnet.address, // a tb1... address
        amount: 50_000n,
        feeRate: 8,
        changeAddress: btcTestnet.address,
        // network omitted → defaults to mainnet, which can't decode "tb1..."
      }),
    ).toThrow();
  });
});

describe('Solana signing (verifies signatures)', () => {
  it('builds and signs a transfer whose signature verifies', () => {
    const signed = buildAndSignSolTransfer({
      secretKey: sol.privateKey,
      toAddress: sol.address,
      lamports: parseSolToLamports('0.001'),
      recentBlockhash: '11111111111111111111111111111111', // 32 zero bytes (valid length)
    });

    expect(signed.signature.length).toBeGreaterThan(0);

    const tx = Transaction.from(base64.decode(signed.base64));
    expect(tx.verifySignatures()).toBe(true);
    expect(tx.feePayer?.toBase58()).toBe(sol.address);
  });
});

// --- Property / fuzz tests ---------------------------------------------------
// Deterministic (seeded) PRNG so a fuzz failure is reproducible, not flaky.
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random valid positive decimal string with 0..maxDecimals fractional digits. */
function randomDecimal(rand: () => number, maxDecimals: number): { str: string; expected: bigint; decimals: number } {
  const whole = Math.floor(rand() * 1_000_000);
  const fracDigits = Math.floor(rand() * (maxDecimals + 1));
  let frac = '';
  for (let i = 0; i < fracDigits; i++) frac += Math.floor(rand() * 10);
  const positiveWhole = whole === 0 && !/[1-9]/.test(frac) ? 1 : whole; // never produce an all-zero amount
  const str = frac.length > 0 ? `${positiveWhole}.${frac}` : `${positiveWhole}`;
  const expected = BigInt(positiveWhole) * 10n ** BigInt(maxDecimals) + BigInt(frac.padEnd(maxDecimals, '0') || '0');
  return { str, expected, decimals: maxDecimals };
}

describe('amount parsing — property fuzzing (200 cases/chain, seeded)', () => {
  const CASES = 200;
  const targets: Array<{ name: string; decimals: number; parse: (s: string) => bigint }> = [
    { name: 'EVM (18dp)', decimals: 18, parse: parseEvmAmount },
    { name: 'BTC (8dp)', decimals: 8, parse: parseBtcToSats },
    { name: 'SOL (9dp)', decimals: 9, parse: parseSolToLamports },
  ];

  for (const { name, decimals, parse } of targets) {
    it(`${name}: round-trips exactly against a reference bigint formula`, () => {
      const rand = mulberry32(0xc0ffee ^ decimals);
      for (let i = 0; i < CASES; i++) {
        const { str, expected } = randomDecimal(rand, decimals);
        expect(parse(str)).toBe(expected);
      }
    });
  }

  it('parseDecimalToBaseUnits matches the same reference formula at arbitrary decimal counts', () => {
    const rand = mulberry32(1337);
    for (const decimals of [0, 1, 6, 8, 9, 12, 18, 24]) {
      for (let i = 0; i < 50; i++) {
        const { str, expected } = randomDecimal(rand, decimals);
        expect(parseDecimalToBaseUnits(str, decimals)).toBe(expected);
      }
    }
  });

  it('rejects every malformed input it is fuzzed with (never throws something other than InvalidAmountError, never returns silently)', () => {
    // Note: leading/trailing whitespace around an otherwise-valid amount
    // ("  1.5  ") is intentionally trimmed-then-accepted by every parser —
    // that's not in this list. These are all genuinely malformed.
    const malformed = [
      '', '   ', '.', '-1', '-1.5', '+1.5', '1.2.3', '1,5', 'abc', '1.2e5',
      '5.', '.5', '--5', '0x5', 'NaN', 'Infinity', '1 2', '1 .5', '1. 5',
      '१.५', '１.５', '1.', '0', '0.0', '0.00',
    ];
    for (const input of malformed) {
      for (const { parse } of targets) {
        expect(() => parse(input), `expected "${input}" to be rejected`).toThrow(InvalidAmountError);
      }
    }
  });

  it('rejects any fuzzed amount with more fractional digits than the chain supports', () => {
    const rand = mulberry32(99);
    for (const { decimals, parse } of targets) {
      for (let i = 0; i < 30; i++) {
        const { str } = randomDecimal(rand, decimals + 1 + Math.floor(rand() * 5)); // always too many dp
        // Guard against the rare case randomDecimal's overflow-prevention logic
        // happens to produce a value with <= `decimals` significant fractional
        // digits (trailing zeros) — only assert when it's genuinely too long.
        const fracLen = str.includes('.') ? str.split('.')[1]!.length : 0;
        if (fracLen > decimals) {
          expect(() => parse(str)).toThrow(InvalidAmountError);
        }
      }
    }
  });
});

describe('Bitcoin transaction building — value-conservation fuzzing (seeded)', () => {
  const rand = mulberry32(424242);

  function randomTxid(): string {
    // Genuinely random (non-uniform) bytes — a repeated single byte value
    // would be its own reverse, silently hiding a byte-order bug in the
    // input-matching check below.
    let out = '';
    for (let i = 0; i < 32; i++) out += Math.floor(rand() * 256).toString(16).padStart(2, '0');
    return out;
  }

  function randomUtxos(count: number): BtcUtxo[] {
    return Array.from({ length: count }, () => ({
      txid: randomTxid(),
      vout: Math.floor(rand() * 3),
      value: BigInt(1_000 + Math.floor(rand() * 4_000_000)), // 1,000–4,001,000 sats
    }));
  }

  it('every successfully-built transaction conserves value exactly (inputs == outputs + fee)', () => {
    let builtCount = 0;
    let insufficientCount = 0;

    for (let i = 0; i < 150; i++) {
      const utxoCount = 1 + Math.floor(rand() * 4);
      const utxos = randomUtxos(utxoCount);
      const totalAvailable = utxos.reduce((s, u) => s + u.value, 0n);
      const amount = BigInt(500 + Math.floor(rand() * Number(totalAvailable) * 1.3)); // sometimes overshoots on purpose
      const feeRate = 0.5 + rand() * 80;

      let signed;
      try {
        signed = buildAndSignBtcTransfer({
          privateKey: btc.privateKey,
          publicKey: btc.publicKey,
          utxos,
          toAddress: btc.address,
          amount,
          feeRate,
          changeAddress: btc.address,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(InsufficientFundsError);
        insufficientCount++;
        continue;
      }
      builtCount++;

      // Decode the ACTUAL signed transaction and verify conservation against
      // the UTXOs it really consumed — not against our own selection logic,
      // so this can't pass by circularly re-implementing the same algorithm.
      const decoded = btcSigner.Transaction.fromRaw(hex.decode(signed.hex), {
        allowUnknownOutputs: true,
        allowUnknownInputs: true,
      });

      let inputTotal = 0n;
      for (let n = 0; n < decoded.inputsLength; n++) {
        const input = decoded.getInput(n);
        const txidHex = input.txid ? hex.encode(input.txid) : '';
        const match = utxos.find((u) => u.txid === txidHex && u.vout === input.index);
        expect(match, 'every decoded input must trace back to one of our UTXOs').toBeDefined();
        inputTotal += match!.value;
      }

      let outputTotal = 0n;
      for (let n = 0; n < decoded.outputsLength; n++) {
        outputTotal += decoded.getOutput(n).amount ?? 0n;
      }

      // The core financial invariant: nothing created, nothing destroyed.
      expect(inputTotal).toBe(outputTotal + signed.fee);
      // The recipient's first output must be at least the requested amount.
      expect(decoded.getOutput(0).amount).toBe(amount);
    }

    // Sanity: the fuzz actually exercised both code paths, not just one.
    expect(builtCount).toBeGreaterThan(0);
    expect(insufficientCount).toBeGreaterThan(0);
  });
});
