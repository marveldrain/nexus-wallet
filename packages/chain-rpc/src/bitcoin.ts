/**
 * Bitcoin read/broadcast client over the Esplora REST API
 * (blockstream.info / mempool.space compatible).
 */
import { fetchJson, fetchText } from './http';

/** UTXO shape consumed by @nexus/tx-builder (kept structurally identical). */
export interface BtcUtxo {
  txid: string;
  vout: number;
  value: bigint;
}

interface EsploraUtxo {
  txid: string;
  vout: number;
  value: number;
  status: { confirmed: boolean };
}

export class BitcoinRpc {
  /** @param apiUrls Esplora base URLs in priority order (failover). */
  constructor(private readonly apiUrls: string[]) {}

  /** Confirmed spendable UTXOs for an address. */
  async getUtxos(address: string, includeUnconfirmed = false): Promise<BtcUtxo[]> {
    const utxos = await fetchJson<EsploraUtxo[]>(this.apiUrls, `/address/${address}/utxo`);
    return utxos
      .filter((u) => includeUnconfirmed || u.status.confirmed)
      .map((u) => ({ txid: u.txid, vout: u.vout, value: BigInt(u.value) }));
  }

  /** Confirmed balance in satoshis. */
  async getBalance(address: string): Promise<bigint> {
    const utxos = await this.getUtxos(address);
    return utxos.reduce((sum, u) => sum + u.value, 0n);
  }

  /** Fee rate in sat/vByte for a target confirmation window (blocks). */
  async getFeeRate(targetBlocks = 6): Promise<number> {
    const estimates = await fetchJson<Record<string, number>>(this.apiUrls, '/fee-estimates');
    return pickFeeRate(estimates, targetBlocks);
  }

  /** Slow (~24 blocks)/average (~6)/fast (~2) sat/vByte fee tiers. */
  async getFeeTiers(): Promise<Record<'slow' | 'avg' | 'fast', number>> {
    const estimates = await fetchJson<Record<string, number>>(this.apiUrls, '/fee-estimates');
    return {
      fast: pickFeeRate(estimates, 2),
      avg: pickFeeRate(estimates, 6),
      slow: pickFeeRate(estimates, 24),
    };
  }

  /** Broadcast a raw signed transaction hex; returns the txid. */
  async broadcast(txHex: string): Promise<string> {
    return fetchText(this.apiUrls, '/tx', { method: 'POST', body: txHex });
  }
}

function pickFeeRate(estimates: Record<string, number>, targetBlocks: number): number {
  return estimates[String(targetBlocks)] ?? estimates['6'] ?? estimates['1'] ?? 2;
}
