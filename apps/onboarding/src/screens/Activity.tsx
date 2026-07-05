import type { WalletTransaction } from '@nexus/chain-rpc';
import { formatTokenAmount } from '@nexus/portfolio';
import { cx, shortAddress, timeAgo } from '../lib';
import { useOnboarding } from '../store';
import { Card, Screen, ScreenHeader } from '../ui';

const CHAIN_META: Record<string, { glyph: string; ring: string; bg: string; symbol: string; decimals: number }> = {
  bitcoin: { glyph: '₿', ring: 'text-amber-400', bg: 'bg-amber-400/10', symbol: 'BTC', decimals: 8 },
  ethereum: { glyph: 'Ξ', ring: 'text-indigo-300', bg: 'bg-indigo-400/10', symbol: 'ETH', decimals: 18 },
  solana: { glyph: '◎', ring: 'text-fuchsia-300', bg: 'bg-fuchsia-400/10', symbol: 'SOL', decimals: 9 },
};

export function Activity() {
  const { activity, activityLoading, openTxDetail, go } = useOnboarding();

  return (
    <Screen>
      <ScreenHeader title="Activity" onBack={() => go('dashboard')} />

      {activityLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm font-medium text-slate-200">No transactions yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Once you send or receive, your on-chain history will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {activity.map((tx) => (
            <TxRow key={`${tx.chain}-${tx.txid}`} tx={tx} onOpen={() => openTxDetail(tx)} />
          ))}
        </div>
      )}
    </Screen>
  );
}

function TxRow({ tx, onOpen }: { tx: WalletTransaction; onOpen: () => void }) {
  const meta = CHAIN_META[tx.chain] ?? CHAIN_META.ethereum!;
  const inbound = tx.direction === 'in';
  const failed = tx.status === 'failed';

  const label =
    tx.direction === 'in'
      ? 'Received'
      : tx.direction === 'out'
        ? 'Sent'
        : tx.direction === 'self'
          ? 'Self transfer'
          : 'Transaction';

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold', meta.bg, meta.ring)}>
        {meta.glyph}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">{label}</span>
          {failed && (
            <span className="rounded-md bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
              Failed
            </span>
          )}
          {tx.status === 'pending' && (
            <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
              Pending
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-slate-500">
          {shortAddress(tx.txid, 8, 6)} · {timeAgo(tx.timestamp)}
        </span>
      </div>

      <div className="text-right">
        {tx.amountKnown ? (
          <div
            className={cx(
              'text-sm font-semibold',
              failed ? 'text-slate-500 line-through' : inbound ? 'text-emerald-400' : 'text-slate-100',
            )}
          >
            {inbound ? '+' : tx.direction === 'out' ? '−' : ''}
            {formatTokenAmount(tx.amount, meta.decimals, 6)} {meta.symbol}
          </div>
        ) : (
          <div className="text-xs text-slate-500">{meta.symbol} ↗</div>
        )}
      </div>
    </button>
  );
}

function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="h-10 w-10 rounded-xl bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="h-2.5 w-40 rounded bg-white/5" />
      </div>
      <div className="ml-auto h-3 w-16 rounded bg-white/10" />
    </div>
  );
}
