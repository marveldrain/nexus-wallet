/**
 * Bitcoin transaction building + signing (native SegWit / P2WPKH).
 *
 * Uses @scure/btc-signer, which validates every signature on `finalize()` —
 * so a successfully finalized transaction is cryptographic proof the inputs
 * were signed correctly by the expected key.
 *
 * Coin selection here is a simple largest-first accumulator with iterative fee
 * estimation. It's correct and conservative; a production build can later swap
 * in branch-and-bound for tighter fees and better privacy.
 */
import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';

import { InsufficientFundsError } from './errors';

export interface BtcUtxo {
  /** Transaction id (big-endian hex, as shown by explorers). */
  txid: string;
  vout: number;
  /** Value in satoshis. */
  value: bigint;
}

export interface BtcTransferParams {
  /** 32-byte private key for the P2WPKH input(s). */
  privateKey: Uint8Array;
  /** 33-byte compressed public key matching the private key. */
  publicKey: Uint8Array;
  utxos: BtcUtxo[];
  toAddress: string;
  /** Amount to send, in satoshis. */
  amount: bigint;
  /** Fee rate in sat/vByte. */
  feeRate: number;
  /** Where to send change (typically the sender's own address). */
  changeAddress: string;
  /** Mainnet ("bc1...") or testnet ("tb1...") encoding. Defaults to mainnet. */
  network?: 'mainnet' | 'testnet';
}

export interface SignedBtcTransaction {
  /** Raw signed transaction hex, ready to broadcast. */
  hex: string;
  txid: string;
  /** Fee actually paid, in satoshis. */
  fee: bigint;
  /** Virtual size in vBytes. */
  vsize: number;
}

/** P2WPKH dust threshold in satoshis — outputs below this are uneconomical. */
const DUST_THRESHOLD = 294n;

/** Rough vsize for an all-P2WPKH transaction. */
function estimateVsize(inputCount: number, outputCount: number): number {
  return Math.ceil(inputCount * 68 + outputCount * 31 + 11);
}

export function buildAndSignBtcTransfer(params: BtcTransferParams): SignedBtcTransaction {
  const { privateKey, publicKey, utxos, toAddress, amount, feeRate, changeAddress } = params;
  const network = params.network === 'testnet' ? btc.TEST_NETWORK : btc.NETWORK;
  const spk = btc.p2wpkh(publicKey, network);

  // Largest-first selection with fee recomputed as inputs are added.
  const sorted = [...utxos].sort((a, b) => (a.value < b.value ? 1 : a.value > b.value ? -1 : 0));
  const selected: BtcUtxo[] = [];
  let total = 0n;
  let fee = 0n;
  let funded = false;
  for (const utxo of sorted) {
    selected.push(utxo);
    total += utxo.value;
    fee = BigInt(Math.ceil(estimateVsize(selected.length, 2) * feeRate));
    if (total >= amount + fee) {
      funded = true;
      break;
    }
  }
  if (!funded) throw new InsufficientFundsError();

  let change = total - amount - fee;
  const tx = new btc.Transaction();
  for (const utxo of selected) {
    tx.addInput({
      txid: hex.decode(utxo.txid),
      index: utxo.vout,
      witnessUtxo: { script: spk.script, amount: utxo.value },
    });
  }
  tx.addOutputAddress(toAddress, amount, network);
  if (change > DUST_THRESHOLD) {
    tx.addOutputAddress(changeAddress, change, network);
  } else {
    // Dust change isn't worth a UTXO — let it fall through to the fee.
    fee += change;
    change = 0n;
  }

  tx.sign(privateKey);
  tx.finalize();

  return { hex: hex.encode(tx.extract()), txid: tx.id, fee, vsize: tx.vsize };
}
