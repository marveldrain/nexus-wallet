/**
 * @nexus/tx-builder — pure, offline transaction construction & signing.
 *
 * Network-derived inputs (nonce, gas, fee rate, UTXOs, blockhash) come from
 * @nexus/chain-rpc; private keys come from @nexus/wallet-core. This package
 * only does deterministic crypto, so it's fully unit-testable without a network.
 */
export {
  buildAndSignEvmTransfer,
  type EvmTransferParams,
  type SignedEvmTransaction,
} from './ethereum';
export {
  buildAndSignBtcTransfer,
  type BtcUtxo,
  type BtcTransferParams,
  type SignedBtcTransaction,
} from './bitcoin';
export {
  buildAndSignSolTransfer,
  type SolTransferParams,
  type SignedSolTransaction,
} from './solana';
export {
  parseEvmAmount,
  parseBtcToSats,
  parseSolToLamports,
  parseDecimalToBaseUnits,
} from './units';
export * from './errors';
