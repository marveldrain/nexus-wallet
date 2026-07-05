# Sending funds — how the packages compose

The send path cleanly separates three concerns so each can be tested and audited
in isolation:

```
@nexus/wallet-core   → the keys      (DerivedAccount: address + private key)
@nexus/chain-rpc     → the network   (nonce, fees, UTXOs, blockhash, broadcast)
@nexus/tx-builder    → the crypto    (build + sign, offline & deterministic)
```

The private key flows only into `tx-builder`'s signing call and is wiped right
after. Network code never sees it; signing code never touches the network.

## Ethereum / EVM

```ts
import { unlockVault } from '@nexus/wallet-core';
import { EvmRpc } from '@nexus/chain-rpc';
import { buildAndSignEvmTransfer, parseEvmAmount } from '@nexus/tx-builder';

const rpc = new EvmRpc(process.env.NEXUS_ETH_RPC_URLS!.split(','), 1);
const keyring = unlockVault(vault, password);
const account = keyring.deriveAccount('ethereum', 0);

const to = '0xRecipient…';
const value = parseEvmAmount('0.01'); // ETH → wei

// 1) gather network state
const [nonce, fees] = await Promise.all([rpc.getNonce(account.address as `0x${string}`), rpc.getFees()]);
const gas = await rpc.estimateGas({ account: account.address as `0x${string}`, to, value });

// 2) sign offline
const { serialized, from } = await buildAndSignEvmTransfer({
  privateKey: account.privateKey,
  to,
  value,
  chainId: rpc.chainId,
  nonce,
  gas,
  ...fees,
});
keyring.lock(); // wipe the seed; private key already used

// 3) (optional) sanity check, then broadcast
if (from !== account.address) throw new Error('signer mismatch');
const txHash = await rpc.broadcast(serialized);
```

## Bitcoin

```ts
import { BitcoinRpc } from '@nexus/chain-rpc';
import { buildAndSignBtcTransfer, parseBtcToSats } from '@nexus/tx-builder';

const rpc = new BitcoinRpc([process.env.NEXUS_BTC_API_URL!]);
const account = keyring.deriveAccount('bitcoin', 0);

const [utxos, feeRate] = await Promise.all([rpc.getUtxos(account.address), rpc.getFeeRate(6)]);

const { hex, txid, fee } = buildAndSignBtcTransfer({
  privateKey: account.privateKey,
  publicKey: account.publicKey,
  utxos,
  toAddress: 'bc1qRecipient…',
  amount: parseBtcToSats('0.001'),
  feeRate,
  changeAddress: account.address, // send change back to self
});

await rpc.broadcast(hex); // returns txid
```

## Solana

```ts
import { SolanaRpc } from '@nexus/chain-rpc';
import { buildAndSignSolTransfer, parseSolToLamports } from '@nexus/tx-builder';

const rpc = new SolanaRpc([process.env.NEXUS_SOLANA_RPC_URL!]);
const account = keyring.deriveAccount('solana', 0);

const recentBlockhash = await rpc.getRecentBlockhash();

const { base64, signature } = buildAndSignSolTransfer({
  secretKey: account.privateKey, // 64-byte ed25519 secret
  toAddress: 'RecipientBase58…',
  lamports: parseSolToLamports('0.05'),
  recentBlockhash,
});

await rpc.broadcast(base64); // returns the signature
```

## What's tested vs. what needs live RPC

- **Signing & construction (`tx-builder`)** — fully unit-tested offline (6 tests):
  EVM signatures recover to the signer, BTC transactions finalize (which
  validates every signature), SOL signatures verify, amount parsing is exact.
- **RPC plumbing (`chain-rpc`)** — failover, error handling, and UTXO/fee parsing
  are unit-tested with a mocked `fetch` (5 tests). The actual reads/broadcasts
  require live endpoints, so wire real RPC URLs from `.env` to exercise them
  end-to-end (ideally on testnet first).
```
