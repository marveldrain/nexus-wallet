/**
 * Solana transfer building + signing (System Program transfer).
 *
 * The recent blockhash (which both scopes and expires the transaction) is
 * supplied by the caller from `@nexus/chain-rpc`, keeping this module offline
 * and deterministic for a given blockhash.
 */
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { base58, base64 } from '@scure/base';

export interface SolTransferParams {
  /** 64-byte ed25519 secret key (DerivedAccount.privateKey for Solana). */
  secretKey: Uint8Array;
  toAddress: string;
  /** Amount in lamports. */
  lamports: bigint;
  /** A recent blockhash from the cluster (expires after ~150 slots). */
  recentBlockhash: string;
}

export interface SignedSolTransaction {
  /** base64 wire-format transaction for sendRawTransaction. */
  base64: string;
  /** base58 transaction signature (its id once confirmed). */
  signature: string;
}

export function buildAndSignSolTransfer(params: SolTransferParams): SignedSolTransaction {
  const from = Keypair.fromSecretKey(params.secretKey);

  const tx = new Transaction();
  tx.add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: new PublicKey(params.toAddress),
      lamports: params.lamports,
    }),
  );
  tx.feePayer = from.publicKey;
  tx.recentBlockhash = params.recentBlockhash;
  tx.sign(from);

  const raw = tx.serialize();
  const signature = tx.signature ? base58.encode(Uint8Array.from(tx.signature)) : '';
  return { base64: base64.encode(Uint8Array.from(raw)), signature };
}
