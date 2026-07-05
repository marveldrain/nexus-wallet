/**
 * Solana read & broadcast client with simple multi-endpoint failover.
 */
import { Connection, PublicKey } from '@solana/web3.js';

export class SolanaRpc {
  private readonly connections: Connection[];

  constructor(rpcUrls: string[]) {
    this.connections = rpcUrls.map((url) => new Connection(url, 'confirmed'));
  }

  /** Balance in lamports. */
  async getBalance(address: string): Promise<bigint> {
    const lamports = await this.tryEach((c) => c.getBalance(new PublicKey(address)));
    return BigInt(lamports);
  }

  /** A recent blockhash for transaction construction. */
  async getRecentBlockhash(): Promise<string> {
    const { blockhash } = await this.tryEach((c) => c.getLatestBlockhash());
    return blockhash;
  }

  /** Broadcast a base64 wire-format transaction; returns the signature. */
  async broadcast(base64Tx: string): Promise<string> {
    const raw = Buffer.from(base64Tx, 'base64');
    return this.tryEach((c) => c.sendRawTransaction(raw));
  }

  private async tryEach<T>(fn: (c: Connection) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (const connection of this.connections) {
      try {
        return await fn(connection);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('All Solana endpoints failed.');
  }
}
