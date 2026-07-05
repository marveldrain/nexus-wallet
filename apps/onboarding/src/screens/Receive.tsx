import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { ChainId } from '@nexus/wallet-core';
import { copyToClipboard, cx } from '../lib';
import { useOnboarding } from '../store';
import { Card, CheckIcon, CopyIcon, Screen, ScreenHeader } from '../ui';

const CHAIN_META: Record<string, { glyph: string; ring: string; bg: string }> = {
  bitcoin: { glyph: '₿', ring: 'text-amber-400', bg: 'bg-amber-400/10' },
  ethereum: { glyph: 'Ξ', ring: 'text-indigo-300', bg: 'bg-indigo-400/10' },
  solana: { glyph: '◎', ring: 'text-fuchsia-300', bg: 'bg-fuchsia-400/10' },
};

export function Receive() {
  const { accounts, selectedChain, openReceive, go } = useOnboarding();
  const account = accounts.find((a) => a.chain === selectedChain) ?? accounts[0];
  const [qr, setQr] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!account) return;
    QRCode.toString(account.address, {
      type: 'svg',
      margin: 1,
      color: { dark: '#0a0a12', light: '#ffffff' },
    })
      .then(setQr)
      .catch(() => setQr(''));
  }, [account?.address]);

  if (!account) return null;

  async function copy() {
    if (account && (await copyToClipboard(account.address))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Receive" onBack={() => go('dashboard')} />

      <Card>
        {/* Asset selector */}
        <div className="mb-6 flex gap-2">
          {accounts.map((a) => {
            const meta = CHAIN_META[a.chain]!;
            const active = a.chain === account.chain;
            return (
              <button
                key={a.chain}
                onClick={() => openReceive(a.chain as ChainId)}
                className={cx(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition',
                  active
                    ? 'border-violet-400/50 bg-violet-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                )}
              >
                <span className={meta.ring}>{meta.glyph}</span>
                {a.ticker}
              </button>
            );
          })}
        </div>

        {/* QR */}
        <div className="flex flex-col items-center">
          <div className="rounded-2xl bg-white p-3 shadow-lg">
            {qr ? (
              <div className="h-44 w-44" dangerouslySetInnerHTML={{ __html: qr }} />
            ) : (
              <div className="h-44 w-44 animate-pulse rounded bg-slate-200" />
            )}
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            Your {account.name} address
          </p>
          <button
            onClick={copy}
            className="mt-2 flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-xs text-slate-200 transition hover:bg-white/10"
          >
            <span className="break-all text-left">{account.address}</span>
            {copied ? (
              <CheckIcon className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <CopyIcon className="h-4 w-4 shrink-0 text-slate-400" />
            )}
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-200">
          Only send <span className="font-semibold">{account.name} ({account.ticker})</span> to this
          address. Sending other assets or networks may result in permanent loss.
        </div>
      </Card>
    </Screen>
  );
}
