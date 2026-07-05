import { useState } from 'react';
import { formatTokenAmount } from '@nexus/portfolio';
import { copyToClipboard, cx, shortAddress } from '../lib';
import { useOnboarding } from '../store';
import { Button, Card, CheckIcon, CopyIcon, Screen, ScreenHeader } from '../ui';

const CHAIN_META: Record<string, { glyph: string; ring: string; bg: string; name: string; symbol: string; decimals: number }> = {
  bitcoin: { glyph: '₿', ring: 'text-amber-400', bg: 'bg-amber-400/10', name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
  ethereum: { glyph: 'Ξ', ring: 'text-indigo-300', bg: 'bg-indigo-400/10', name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  solana: { glyph: '◎', ring: 'text-fuchsia-300', bg: 'bg-fuchsia-400/10', name: 'Solana', symbol: 'SOL', decimals: 9 },
};

export function TransactionDetail() {
  const { selectedTx: tx, go } = useOnboarding();
  const [copied, setCopied] = useState<'txid' | 'counterparty' | null>(null);

  if (!tx) {
    go('activity');
    return null;
  }

  const meta = CHAIN_META[tx.chain] ?? CHAIN_META.ethereum!;
  const inbound = tx.direction === 'in';
  const outbound = tx.direction === 'out';
  const failed = tx.status === 'failed';

  const title = inbound ? 'Received' : outbound ? 'Sent' : tx.direction === 'self' ? 'Self transfer' : 'Transaction';

  async function copy(field: 'txid' | 'counterparty', value: string) {
    if (await copyToClipboard(value)) {
      setCopied(field);
      setTimeout(() => setCopied(null), 1600);
    }
  }

  const fullDate = tx.timestamp
    ? new Date(tx.timestamp * 1000).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Pending confirmation';

  return (
    <Screen>
      <ScreenHeader title="Transaction" onBack={() => go('activity')} />
      <Card className="text-center">
        <span className={cx('mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold', meta.bg, meta.ring)}>
          {meta.glyph}
        </span>
        <h2 className="mt-3 text-xl font-bold text-slate-100">{title}</h2>

        {tx.amountKnown ? (
          <p
            className={cx(
              'mt-1 text-2xl font-extrabold',
              failed ? 'text-slate-500 line-through' : inbound ? 'text-emerald-400' : 'text-slate-100',
            )}
          >
            {inbound ? '+' : outbound ? '−' : ''}
            {formatTokenAmount(tx.amount, meta.decimals, 8)} {meta.symbol}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-400">Amount unavailable for this chain yet</p>
        )}

        <div className="mt-2 flex justify-center">
          {failed && (
            <span className="rounded-md bg-rose-400/10 px-2 py-0.5 text-xs font-medium text-rose-300">Failed</span>
          )}
          {tx.status === 'pending' && (
            <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-300">Pending</span>
          )}
          {tx.status === 'confirmed' && (
            <span className="flex items-center gap-1 rounded-md bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
              <CheckIcon className="h-3 w-3" /> Confirmed
            </span>
          )}
        </div>

        <div className="mt-6 space-y-3 text-left">
          <Row label="Network" value={meta.name} />
          <Row label="Date" value={fullDate} />
          {tx.counterparty && (
            <CopyRow
              label={inbound ? 'From' : 'To'}
              value={tx.counterparty}
              display={shortAddress(tx.counterparty, 10, 8)}
              copied={copied === 'counterparty'}
              onCopy={() => copy('counterparty', tx.counterparty!)}
            />
          )}
          <CopyRow
            label="Transaction ID"
            value={tx.txid}
            display={shortAddress(tx.txid, 10, 8)}
            copied={copied === 'txid'}
            onCopy={() => copy('txid', tx.txid)}
          />
        </div>

        <a href={tx.explorerUrl} target="_blank" rel="noreferrer">
          <Button variant="ghost" className="mt-6 w-full">
            View on block explorer ↗
          </Button>
        </a>
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm text-slate-200">{value}</span>
    </div>
  );
}

function CopyRow({
  label,
  display,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  display: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3">
      <span className="text-xs text-slate-400">{label}</span>
      <button onClick={onCopy} className="flex items-center gap-1.5 font-mono text-sm text-slate-200 hover:text-white">
        {display}
        {copied ? <CheckIcon className="h-3.5 w-3.5 text-emerald-400" /> : <CopyIcon className="h-3.5 w-3.5 text-slate-500" />}
      </button>
    </div>
  );
}
