/**
 * @nexus/chain-rpc — read balances/fees and broadcast signed transactions over
 * public RPCs, with automatic multi-endpoint failover. No proprietary backend.
 */
export { BitcoinRpc, type BtcUtxo } from './bitcoin';
export { EvmRpc, type EvmFeeEstimate, type EvmFeeTiers, type FeeTierId } from './ethereum';
export { SolanaRpc } from './solana';
export {
  getBitcoinHistory,
  getEthereumHistory,
  getSolanaHistory,
  type WalletTransaction,
  type TxDirection,
  type TxStatus,
} from './history';
export { getEvmTokens, getSolanaTokens, getErc20TokenInfo, type TokenBalance } from './tokens';
export { resolveEnsName, looksLikeEnsName } from './ens';
export { resolveSnsName, looksLikeSnsName } from './sns';
export { fetchJson, fetchText } from './http';
export { RpcError } from './errors';
