import { useState } from 'react';
import type { ChainId } from '@nexus/wallet-core';
import { cx } from '../lib';
import { isValidAddress } from '../data/address';
import { useOnboarding } from '../store';
import { Button, Card, Screen, ScreenHeader } from '../ui';

const CHAINS: Array<{ chain: ChainId; ticker: string; glyph: string; ring: string }> = [
  { chain: 'bitcoin', ticker: 'BTC', glyph: '₿', ring: 'text-amber-400' },
  { chain: 'ethereum', ticker: 'ETH', glyph: 'Ξ', ring: 'text-indigo-300' },
  { chain: 'solana', ticker: 'SOL', glyph: '◎', ring: 'text-fuchsia-300' },
];

const EXAMPLES: Record<ChainId, string> = {
  ethereum: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
  bitcoin: '12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX', // Hal Finney's address — modest, real balance
  solana: 'So11111111111111111111111111111111111111112',
};

export function WatchAddress() {
  const { watch, vault, go } = useOnboarding();
  const [chain, setChain] = useState<ChainId>('ethereum');
  const [address, setAddress] = useState('');

  const valid = isValidAddress(chain, address);
  const touched = address.trim().length > 0;

  return (
    <Screen>
      <ScreenHeader title="Watch an address" onBack={() => go(vault ? 'unlock' : 'welcome')} />

      <Card>
        <p className="text-sm text-slate-400">
          Track any address read-only — see its live balance, tokens, and history. No keys needed,
          you can&apos;t send.
        </p>

        <div className="mt-5 mb-4 flex gap-2">
          {CHAINS.map((c) => {
            const active = c.chain === chain;
            return (
              <button
                key={c.chain}
                onClick={() => {
                  setChain(c.chain);
                  setAddress('');
                }}
                className={cx(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition',
                  active
                    ? 'border-violet-400/50 bg-violet-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                )}
              >
                <span className={c.ring}>{c.glyph}</span>
                {c.ticker}
              </button>
            );
          })}
        </div>

        <label className="mb-1.5 block text-xs font-medium text-slate-400">Address</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          spellCheck={false}
          autoComplete="off"
          placeholder={`Paste a ${chain} address`}
          className={cx(
            'w-full resize-none rounded-xl border bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2',
            touched && !valid
              ? 'border-red-500/40 focus:ring-red-500/30'
              : 'border-white/10 focus:border-violet-400/50 focus:ring-violet-500/30',
          )}
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className={touched && !valid ? 'text-red-400' : 'text-slate-500'}>
            {touched && !valid ? 'Not a valid address for this chain' : ' '}
          </span>
          <button
            onClick={() => setAddress(EXAMPLES[chain])}
            className="text-violet-300 transition hover:text-violet-200"
          >
            Try an example
          </button>
        </div>

        <Button className="mt-6 w-full" disabled={!valid} onClick={() => watch(chain, address.trim())}>
          View address
        </Button>
      </Card>
    </Screen>
  );
}
