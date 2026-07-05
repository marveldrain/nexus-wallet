/**
 * Transaction history, normalized across chains.
 *
 *  - Bitcoin: Esplora `/address/{addr}/txs`
 *  - Ethereum: Blockscout REST (`/api/v2/addresses/{addr}/transactions`) — a
 *    plain JSON-RPC node can't list an address's history, so we use a free,
 *    CORS-friendly indexer.
 *  - Solana: `getSignaturesForAddress` (RPC-native). Amounts require a follow-up
 *    getTransaction per signature, so they're left unknown in this first pass.
 */
import { fetchJson } from './http';

export type TxDirection = 'in' | 'out' | 'self' | 'unknown';
export type TxStatus = 'confirmed' | 'pending' | 'failed';

export interface WalletTransaction {
  chain: string;
  txid: string;
  /** Unix seconds, or null if not yet in a block. */
  timestamp: number | null;
  status: TxStatus;
  direction: TxDirection;
  /** Net amount in smallest units (0 when unknown). */
  amount: bigint;
  amountKnown: boolean;
  explorerUrl: string;
  /** The other party's address, when it can be determined unambiguously. */
  counterparty?: string;
}

// --- Bitcoin (Esplora) -------------------------------------------------------
interface EsploraTx {
  txid: string;
  status: { confirmed: boolean; block_time?: number };
  vin: Array<{ prevout?: { scriptpubkey_address?: string; value: number } }>;
  vout: Array<{ scriptpubkey_address?: string; value: number }>;
}

export async function getBitcoinHistory(
  apiUrls: string[],
  address: string,
  limit = 25,
): Promise<WalletTransaction[]> {
  const txs = await fetchJson<EsploraTx[]>(apiUrls, `/address/${address}/txs`);
  return txs.slice(0, limit).map((tx) => {
    let received = 0n;
    let spent = 0n;
    for (const v of tx.vout) if (v.scriptpubkey_address === address) received += BigInt(v.value);
    for (const v of tx.vin) {
      if (v.prevout?.scriptpubkey_address === address) spent += BigInt(v.prevout.value);
    }
    const net = received - spent;
    const direction: TxDirection = net > 0n ? 'in' : net < 0n ? 'out' : 'self';
    // Best-effort counterparty: the other side of a simple transfer. Ambiguous
    // for multi-recipient/multi-sender transactions, so left undefined there.
    const counterparty =
      direction === 'out'
        ? tx.vout.find((v) => v.scriptpubkey_address && v.scriptpubkey_address !== address)?.scriptpubkey_address
        : direction === 'in'
          ? tx.vin.find((v) => v.prevout?.scriptpubkey_address && v.prevout.scriptpubkey_address !== address)
              ?.prevout?.scriptpubkey_address
          : undefined;
    return {
      chain: 'bitcoin',
      txid: tx.txid,
      timestamp: tx.status.block_time ?? null,
      status: tx.status.confirmed ? 'confirmed' : 'pending',
      direction,
      amount: net < 0n ? -net : net,
      amountKnown: true,
      explorerUrl: `https://mempool.space/tx/${tx.txid}`,
      counterparty,
    };
  });
}

// --- Ethereum (Blockscout) ---------------------------------------------------
interface BlockscoutTx {
  hash: string;
  value: string;
  timestamp: string | null;
  status: string | null;
  result?: string;
  from: { hash: string } | null;
  to: { hash: string } | null;
}

export async function getEthereumHistory(
  blockscoutBaseUrl: string,
  address: string,
  limit = 25,
): Promise<WalletTransaction[]> {
  const data = await fetchJson<{ items?: BlockscoutTx[] }>(
    [blockscoutBaseUrl],
    `/api/v2/addresses/${address}/transactions`,
  );
  const self = address.toLowerCase();
  return (data.items ?? []).slice(0, limit).map((tx) => {
    const from = tx.from?.hash?.toLowerCase();
    const to = tx.to?.hash?.toLowerCase();
    const direction: TxDirection =
      from === self && to === self ? 'self' : from === self ? 'out' : to === self ? 'in' : 'unknown';
    const failed = (tx.status && tx.status !== 'ok') || (tx.result && tx.result !== 'success');
    return {
      chain: 'ethereum',
      txid: tx.hash,
      timestamp: tx.timestamp ? Math.floor(Date.parse(tx.timestamp) / 1000) : null,
      status: failed ? 'failed' : 'confirmed',
      direction,
      amount: BigInt(tx.value || '0'),
      amountKnown: true,
      explorerUrl: `https://etherscan.io/tx/${tx.hash}`,
      counterparty: direction === 'out' ? tx.to?.hash : direction === 'in' ? tx.from?.hash : undefined,
    };
  });
}

// --- Solana (getSignaturesForAddress) ----------------------------------------
interface SolSignature {
  signature: string;
  blockTime: number | null;
  err: unknown | null;
}

export async function getSolanaHistory(
  rpcUrls: string[],
  address: string,
  limit = 25,
): Promise<WalletTransaction[]> {
  const res = await fetchJson<{ result?: SolSignature[] }>(rpcUrls, '', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [address, { limit }],
    }),
  });
  return (res.result ?? []).map((s) => ({
    chain: 'solana',
    txid: s.signature,
    timestamp: s.blockTime,
    status: s.err ? 'failed' : 'confirmed',
    direction: 'unknown' as TxDirection,
    amount: 0n,
    amountKnown: false,
    explorerUrl: `https://solscan.io/tx/${s.signature}`,
  }));
}
