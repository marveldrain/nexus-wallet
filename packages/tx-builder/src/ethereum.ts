/**
 * Ethereum / EVM transaction signing (EIP-1559).
 *
 * Signing is fully offline and deterministic (RFC-6979 via viem). The caller
 * supplies all network-derived fields (nonce, gas, fees) from `@nexus/chain-rpc`
 * so this module never touches the network and stays trivially testable.
 */
import { toHex, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export interface EvmTransferParams {
  /** 32-byte secp256k1 private key (from DerivedAccount.privateKey). */
  privateKey: Uint8Array;
  to: Hex;
  /** Amount in wei. */
  value: bigint;
  chainId: number;
  nonce: number;
  /** Gas limit (21000 for a plain native transfer). */
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  /** Optional calldata (contract interactions / token transfers). */
  data?: Hex;
}

export interface SignedEvmTransaction {
  /** RLP-encoded signed transaction, ready for eth_sendRawTransaction. */
  serialized: Hex;
  /** Recovered sender — handy for a final sanity check before broadcast. */
  from: Hex;
}

/**
 * Build and sign an EIP-1559 transfer. Works for any EVM chain — just pass the
 * right `chainId`. The same keypair is valid across all of them.
 */
export async function buildAndSignEvmTransfer(
  params: EvmTransferParams,
): Promise<SignedEvmTransaction> {
  const account = privateKeyToAccount(toHex(params.privateKey));

  const serialized = await account.signTransaction({
    type: 'eip1559',
    chainId: params.chainId,
    nonce: params.nonce,
    to: params.to,
    value: params.value,
    gas: params.gas,
    maxFeePerGas: params.maxFeePerGas,
    maxPriorityFeePerGas: params.maxPriorityFeePerGas,
    ...(params.data ? { data: params.data } : {}),
  });

  return { serialized, from: account.address };
}
