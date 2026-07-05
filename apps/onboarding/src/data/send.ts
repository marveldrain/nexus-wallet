/**
 * Send orchestration (multichain).
 *
 * With USE_LIVE (default) this is a REAL end-to-end send: network params come
 * from @nexus/chain-rpc, signing from @nexus/tx-builder, broadcast to the live
 * chain. A `SendTarget` selects WHICH chain/network — every EVM network is
 * supported via the same Ethereum key. With USE_LIVE=false it falls back to a
 * mocked path for offline demos. The derived private key is wiped after signing.
 *
 * Fee tiers (slow/avg/fast) are tunable for EVM and Bitcoin, where the network
 * actually has a fee market. Solana's fee is effectively fixed per signature, so
 * it's presented as a single, non-tunable estimate.
 *
 * ⚠️ Live mode broadcasts to MAINNET; the UI gates it behind review→confirm.
 */
import { keccak256 } from 'viem';
import { Keyring, wipe } from '@nexus/wallet-core';
import { BitcoinRpc, EvmRpc, SolanaRpc, type EvmFeeEstimate } from '@nexus/chain-rpc';
import {
  buildAndSignBtcTransfer,
  buildAndSignEvmTransfer,
  buildAndSignSolTransfer,
} from '@nexus/tx-builder';
import { RPC, TESTNET_RPC, USE_LIVE } from '../config';
import type { EvmNetwork } from './networks';

export type SendTarget =
  | { kind: 'bitcoin'; testnet?: boolean }
  | { kind: 'solana'; testnet?: boolean }
  | { kind: 'evm'; network: EvmNetwork };

export interface FeeEstimate {
  baseUnits: bigint;
  decimals: number;
  label: string;
}

export type FeeTierId = 'slow' | 'avg' | 'fast';

export interface FeeOption {
  id: FeeTierId;
  label: string;
  estimate: FeeEstimate;
  /** Raw params to sign with, so the chosen tier is used exactly (no re-fetch drift). */
  evm?: EvmFeeEstimate;
  btcFeeRate?: number;
}

export interface FeeOptions {
  options: FeeOption[];
  /** False for chains (e.g. Solana) where the fee is effectively fixed. */
  tunable: boolean;
}

const TIER_LABEL: Record<FeeTierId, string> = { slow: 'Slow', avg: 'Average', fast: 'Fast' };
const TIER_IDS: FeeTierId[] = ['slow', 'avg', 'fast'];

const STATIC_FEE = {
  evm: (): FeeEstimate => ({ baseUnits: 21_000n * 25_000_000_000n, decimals: 18, label: 'Network fee' }),
  bitcoin: (): FeeEstimate => ({ baseUnits: 1_680n, decimals: 8, label: 'Network fee' }),
  solana: (): FeeEstimate => ({ baseUnits: 5_000n, decimals: 9, label: 'Network fee' }),
};

const BTC_TYPICAL_VSIZE = 140n;

function singleOption(estimate: FeeEstimate): FeeOptions {
  return { options: [{ id: 'avg', label: 'Network fee', estimate }], tunable: false };
}

/** Slow/average/fast fee options for the target network (single option if untunable). */
export async function getFeeOptions(target: SendTarget): Promise<FeeOptions> {
  if (!USE_LIVE) return singleOption(staticFee(target));

  try {
    if (target.kind === 'evm') {
      const tiers = await new EvmRpc(target.network.rpcUrls, target.network.chainId).getFeeTiers();
      const options = TIER_IDS.map((id): FeeOption => ({
        id,
        label: TIER_LABEL[id],
        estimate: { baseUnits: 21_000n * tiers[id].maxFeePerGas, decimals: 18, label: 'Network fee' },
        evm: tiers[id],
      }));
      return { options, tunable: true };
    }

    if (target.kind === 'bitcoin') {
      const apiUrls = target.testnet ? TESTNET_RPC.bitcoin : RPC.bitcoin;
      const tiers = await new BitcoinRpc(apiUrls).getFeeTiers();
      // Keep the rate fractional — rounding only happens once, on the final fee
      // total, to preserve the (often sub-1-sat/vB) spread between tiers.
      const options = TIER_IDS.map((id): FeeOption => {
        const rate = Math.max(0.1, tiers[id]);
        const totalSats = BigInt(Math.ceil(rate * Number(BTC_TYPICAL_VSIZE)));
        return {
          id,
          label: TIER_LABEL[id],
          estimate: { baseUnits: totalSats, decimals: 8, label: 'Network fee' },
          btcFeeRate: rate,
        };
      });
      return { options, tunable: true };
    }

    return singleOption(STATIC_FEE.solana());
  } catch {
    return singleOption(staticFee(target));
  }
}

function staticFee(target: SendTarget): FeeEstimate {
  return target.kind === 'evm' ? STATIC_FEE.evm() : STATIC_FEE[target.kind]();
}

export interface BroadcastResult {
  id: string;
  explorerUrl: string;
}

/** Build, sign, and broadcast a transfer on the target network. */
export async function signAndSend(
  keyring: Keyring,
  target: SendTarget,
  toAddress: string,
  amountBaseUnits: bigint,
  feeOption?: FeeOption,
): Promise<BroadcastResult> {
  if (!USE_LIVE) return signAndSendMock(keyring, target, toAddress, amountBaseUnits);

  if (target.kind === 'evm') {
    const net = target.network;
    const account = keyring.deriveAccount('ethereum', 0);
    try {
      const rpc = new EvmRpc(net.rpcUrls, net.chainId);
      const [nonce, fees] = await Promise.all([
        rpc.getNonce(account.address as `0x${string}`),
        feeOption?.evm ? Promise.resolve(feeOption.evm) : rpc.getFees(),
      ]);
      const signed = await buildAndSignEvmTransfer({
        privateKey: account.privateKey,
        to: toAddress as `0x${string}`,
        value: amountBaseUnits,
        chainId: net.chainId,
        nonce,
        gas: 21_000n,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      const hash = await rpc.broadcast(signed.serialized);
      return { id: hash, explorerUrl: net.explorerTx + hash };
    } finally {
      wipe(account.privateKey);
    }
  }

  if (target.kind === 'bitcoin') {
    const account = target.testnet
      ? keyring.deriveBitcoinTestnetAccount(0)
      : keyring.deriveAccount('bitcoin', 0);
    try {
      const apiUrls = target.testnet ? TESTNET_RPC.bitcoin : RPC.bitcoin;
      const rpc = new BitcoinRpc(apiUrls);
      const [utxos, feeRate] = await Promise.all([
        rpc.getUtxos(account.address),
        feeOption?.btcFeeRate ? Promise.resolve(feeOption.btcFeeRate) : rpc.getFeeRate(6),
      ]);
      const signed = buildAndSignBtcTransfer({
        privateKey: account.privateKey,
        publicKey: account.publicKey,
        utxos,
        toAddress,
        amount: amountBaseUnits,
        // Fractional sat/vB is intentional — tx-builder rounds once on the
        // final fee total, preserving sub-1-sat/vB tier differences.
        feeRate: Math.max(0.1, feeRate),
        changeAddress: account.address,
        network: target.testnet ? 'testnet' : 'mainnet',
      });
      const txid = await rpc.broadcast(signed.hex);
      const explorerBase = target.testnet ? 'https://mempool.space/testnet/tx/' : 'https://mempool.space/tx/';
      return { id: txid, explorerUrl: explorerBase + txid };
    } finally {
      wipe(account.privateKey);
    }
  }

  // solana
  const account = keyring.deriveAccount('solana', 0);
  try {
    const rpcUrls = target.testnet ? TESTNET_RPC.solana : RPC.solana;
    const rpc = new SolanaRpc(rpcUrls);
    const recentBlockhash = await rpc.getRecentBlockhash();
    const signed = buildAndSignSolTransfer({
      secretKey: account.privateKey,
      toAddress,
      lamports: amountBaseUnits,
      recentBlockhash,
    });
    const sig = await rpc.broadcast(signed.base64);
    const explorerUrl = target.testnet
      ? `https://solscan.io/tx/${sig}?cluster=devnet`
      : `https://solscan.io/tx/${sig}`;
    return { id: sig, explorerUrl };
  } finally {
    wipe(account.privateKey);
  }
}

/** Offline demo path: real signing with mocked params, simulated broadcast. */
async function signAndSendMock(
  keyring: Keyring,
  target: SendTarget,
  toAddress: string,
  amountBaseUnits: bigint,
): Promise<BroadcastResult> {
  let result: BroadcastResult;
  if (target.kind === 'evm') {
    const account = keyring.deriveAccount('ethereum', 0);
    try {
      const signed = await buildAndSignEvmTransfer({
        privateKey: account.privateKey,
        to: toAddress as `0x${string}`,
        value: amountBaseUnits,
        chainId: target.network.chainId,
        nonce: 0,
        gas: 21_000n,
        maxFeePerGas: 25_000_000_000n,
        maxPriorityFeePerGas: 1_500_000_000n,
      });
      const hash = keccak256(signed.serialized);
      result = { id: hash, explorerUrl: target.network.explorerTx + hash };
    } finally {
      wipe(account.privateKey);
    }
  } else if (target.kind === 'bitcoin') {
    const account = keyring.deriveAccount('bitcoin', 0);
    try {
      const signed = buildAndSignBtcTransfer({
        privateKey: account.privateKey,
        publicKey: account.publicKey,
        utxos: [{ txid: 'a'.repeat(64), vout: 0, value: amountBaseUnits + 100_000n }],
        toAddress,
        amount: amountBaseUnits,
        feeRate: 12,
        changeAddress: account.address,
      });
      result = { id: signed.txid, explorerUrl: `https://mempool.space/tx/${signed.txid}` };
    } finally {
      wipe(account.privateKey);
    }
  } else {
    const account = keyring.deriveAccount('solana', 0);
    try {
      const signed = buildAndSignSolTransfer({
        secretKey: account.privateKey,
        toAddress,
        lamports: amountBaseUnits,
        recentBlockhash: '11111111111111111111111111111111',
      });
      result = { id: signed.signature, explorerUrl: `https://solscan.io/tx/${signed.signature}` };
    } finally {
      wipe(account.privateKey);
    }
  }
  await new Promise((r) => setTimeout(r, 700));
  return result;
}
