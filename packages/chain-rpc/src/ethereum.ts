/**
 * Ethereum / EVM read & broadcast client.
 *
 * Built on viem's `fallback` transport, which automatically fails over across
 * the provided RPC URLs and ranks them by latency/health.
 */
import { createPublicClient, fallback, http, type Address, type Hex } from 'viem';

export interface EvmFeeEstimate {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export type FeeTierId = 'slow' | 'avg' | 'fast';

export type EvmFeeTiers = Record<FeeTierId, EvmFeeEstimate>;

export class EvmRpc {
  private readonly client;
  readonly chainId: number;

  constructor(rpcUrls: string[], chainId: number) {
    this.chainId = chainId;
    this.client = createPublicClient({
      transport: fallback(rpcUrls.map((url) => http(url))),
    });
  }

  /** Native balance in wei. */
  getBalance(address: Address): Promise<bigint> {
    return this.client.getBalance({ address });
  }

  /** Next nonce (pending transaction count). */
  getNonce(address: Address): Promise<number> {
    return this.client.getTransactionCount({ address });
  }

  /** EIP-1559 fee suggestion. */
  async getFees(): Promise<EvmFeeEstimate> {
    const { maxFeePerGas, maxPriorityFeePerGas } = await this.client.estimateFeesPerGas();
    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  /**
   * Slow/average/fast EIP-1559 fee tiers, derived from the current base fee
   * plus a priority-fee multiplier per tier. `maxFeePerGas` headroom (2× base)
   * protects against base-fee spikes before a tx confirms.
   */
  async getFeeTiers(): Promise<EvmFeeTiers> {
    const [block, priority] = await Promise.all([
      this.client.getBlock({ blockTag: 'latest' }),
      this.client.estimateMaxPriorityFeePerGas(),
    ]);
    const baseFee = block.baseFeePerGas ?? 0n;
    const tier = (priorityMultiplierTenths: bigint): EvmFeeEstimate => {
      const maxPriorityFeePerGas = (priority * priorityMultiplierTenths) / 10n;
      return { maxPriorityFeePerGas, maxFeePerGas: baseFee * 2n + maxPriorityFeePerGas };
    };
    return { slow: tier(8n), avg: tier(15n), fast: tier(25n) };
  }

  /** Estimate the gas limit for a transaction. */
  estimateGas(args: { account: Address; to: Address; value?: bigint; data?: Hex }): Promise<bigint> {
    return this.client.estimateGas(args);
  }

  /** Broadcast a signed transaction; returns the tx hash. */
  broadcast(serializedTransaction: Hex): Promise<Hex> {
    return this.client.sendRawTransaction({ serializedTransaction });
  }
}
