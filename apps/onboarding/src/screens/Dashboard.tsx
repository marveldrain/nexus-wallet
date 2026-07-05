import { useEffect, useState } from 'react';
import {
  formatFiat,
  formatPercent,
  formatSignedFiat,
  formatTokenAmount,
  type Position,
} from '@nexus/portfolio';
import { copyToClipboard, cx, shortAddress } from '../lib';
import { useOnboarding } from '../store';
import type { TokenPosition } from '../data/tokens';
import { ASSET_META, EVM_NETWORK_IDS } from '../data/networks';
import { USE_LIVE } from '../config';
import {
  AreaChart,
  BookIcon,
  Button,
  Card,
  CheckIcon,
  CopyIcon,
  GearIcon,
  Logo,
  ReceiveIcon,
  Screen,
  SendIcon,
} from '../ui';

const FALLBACK_STYLE = { ring: 'text-indigo-300', bg: 'bg-indigo-400/10', glyph: 'Ξ' };

export function Dashboard() {
  const {
    accounts,
    portfolio,
    valueSeries,
    portfolioLoading,
    error,
    tokens,
    tokensUsd,
    watchAddress,
    accountIndex,
    accountList,
    loadPortfolio,
    openSend,
    openReceive,
    openActivity,
    openContacts,
    openAddToken,
    openAccounts,
    removeCustomToken,
    fiatCurrency,
    networkMode,
    exitWatch,
    lock,
    reset,
    go,
  } = useOnboarding();

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  const watching = !!watchAddress;
  const testnet = networkMode === 'testnet' && !watching;
  // The Ethereum address backs every EVM network position (mainnet L2s AND Sepolia).
  const ethAddress = accounts.find((a) => a.chain === 'ethereum')?.address ?? '';
  const addressFor = (chainId: string): string => {
    const direct = accounts.find((a) => a.chain === chainId)?.address;
    if (direct) return direct;
    return EVM_NETWORK_IDS.has(chainId) || chainId === 'sepolia' ? ethAddress : '';
  };
  const positive = (portfolio?.change24hPct ?? 0) >= 0;
  const netWorthUsd = (portfolio?.totalUsd ?? 0) + tokensUsd;
  const isEmpty = !!portfolio && !portfolioLoading && netWorthUsd === 0;
  // Only show chains the address actually holds (we value ~9 networks).
  const heldPositions = portfolio ? portfolio.positions.filter((p) => p.amount > 0n) : [];
  const accountName = accountList.find((a) => a.index === accountIndex)?.name ?? 'Account 1';

  return (
    <Screen>
      <div className="mb-5 flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          {!watching && (
            <button
              onClick={openAccounts}
              className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              {accountName}
              <span className="text-xs text-slate-500">▾</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!watching && (
            <button
              onClick={openContacts}
              aria-label="Address book"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
            >
              <BookIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => go('settings')}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <GearIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => void loadPortfolio()}
            disabled={portfolioLoading}
            aria-label="Refresh balances"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshIcon className={cx('h-4 w-4', portfolioLoading && 'animate-spin')} />
          </button>
          <Button
            variant="ghost"
            className="h-9 px-3 text-xs"
            onClick={watching ? exitWatch : lock}
          >
            {watching ? 'Exit' : 'Lock'}
          </Button>
        </div>
      </div>

      {testnet && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-200">
          🧪 Testnet mode — Bitcoin testnet3 · Ethereum Sepolia · Solana devnet. Funds shown have
          no real value.
        </div>
      )}

      <Card>
        {/* Portfolio header */}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total balance</p>
        {portfolio ? (
          <>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-4xl font-extrabold tracking-tight">
                {formatFiat(netWorthUsd, fiatCurrency)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cx(
                  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold',
                  positive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300',
                )}
              >
                {positive ? '▲' : '▼'} {formatSignedFiat(portfolio.change24hUsd, fiatCurrency)} (
                {formatPercent(portfolio.change24hPct)})
              </span>
              <span className="text-xs text-slate-500">24h</span>
            </div>
            <div className="mt-4">
              <AreaChart data={valueSeries} positive={positive} />
            </div>
          </>
        ) : (
          <HeaderSkeleton />
        )}
      </Card>

      {/* Primary actions (hidden in read-only watch mode) */}
      {watching ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/5 px-3 py-2.5 text-xs text-violet-200">
          <span>👁 Watch-only ·</span>
          <span className="font-mono">{shortAddress(watchAddress!, 10, 6)}</span>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button onClick={() => openSend()}>
            <SendIcon className="h-4 w-4" /> Send
          </Button>
          <Button variant="ghost" onClick={() => openReceive()}>
            <ReceiveIcon className="h-4 w-4" /> Receive
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <span>{error}</span>
          <button onClick={() => void loadPortfolio()} className="font-semibold underline-offset-2 hover:underline">
            Retry
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <p className="text-sm font-medium text-slate-200">
            {watching ? 'This address is empty' : 'Your wallet is empty'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {watching
              ? 'No balance found on this network for this address.'
              : 'Receive crypto to get started — your live balances will appear here.'}
          </p>
          {!watching && (
            <Button variant="ghost" className="mt-3 h-9 px-4 text-xs" onClick={() => openReceive()}>
              <ReceiveIcon className="h-4 w-4" /> Receive
            </Button>
          )}
        </div>
      )}

      {/* Assets */}
      {!isEmpty && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assets</p>
            <button
              onClick={openActivity}
              className="text-xs font-medium text-violet-300 transition hover:text-violet-200"
            >
              Activity →
            </button>
          </div>
          <div className="space-y-2.5">
            {portfolio && !portfolioLoading
              ? heldPositions.map((pos) => (
                  <AssetRow
                    key={pos.chain}
                    position={pos}
                    address={addressFor(pos.chain)}
                    currency={fiatCurrency}
                  />
                ))
              : [0, 1, 2].map((i) => <RowSkeleton key={i} />)}
          </div>
        </div>
      )}

      {/* Tokens (mainnet-only feature) */}
      {!watching && !testnet && portfolio !== null && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tokens</p>
            <button
              onClick={openAddToken}
              className="text-xs font-medium text-violet-300 transition hover:text-violet-200"
            >
              + Add token
            </button>
          </div>
          {tokens.length > 0 ? (
            <div className="space-y-2.5">
              {tokens.map((t) => (
                <TokenRow
                  key={`${t.chain}-${t.contract}`}
                  token={t}
                  currency={fiatCurrency}
                  onRemove={t.isCustom ? () => void removeCustomToken(t.contract) : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="px-1 text-xs text-slate-500">No tokens yet — add one by contract.</p>
          )}
        </div>
      )}

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        {USE_LIVE ? (
          <>
            <span
              className={cx(
                'inline-block h-1.5 w-1.5 rounded-full animate-pulse-glow',
                testnet ? 'bg-amber-400' : 'bg-emerald-400',
              )}
            />
            {testnet ? 'Live testnet balances' : 'Live balances from public RPCs'}
          </>
        ) : (
          <>Demo data</>
        )}
        <span className="text-slate-700">·</span>
        {watching ? (
          <button onClick={exitWatch} className="text-slate-400 underline-offset-2 hover:underline">
            Exit watch mode
          </button>
        ) : (
          <button onClick={reset} className="text-slate-400 underline-offset-2 hover:underline">
            Start over
          </button>
        )}
      </p>
    </Screen>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12a9 9 0 0 1 15.5-6.3M21 5v4h-4M21 12a9 9 0 0 1-15.5 6.3M3 19v-4h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssetRow({
  position,
  address,
  currency,
}: {
  position: Position;
  address: string;
  currency: string;
}) {
  const [copied, setCopied] = useState(false);
  const style = ASSET_META[position.chain] ?? FALLBACK_STYLE;
  const up = position.change24hPct >= 0;

  async function copy() {
    if (address && (await copyToClipboard(address))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <span
        className={cx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold',
          style.bg,
          style.ring,
        )}
      >
        {style.glyph}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">{position.name}</span>
          <span className={cx('text-xs font-medium', up ? 'text-emerald-400' : 'text-rose-400')}>
            {formatPercent(position.change24hPct)}
          </span>
        </div>
        <button
          onClick={copy}
          className="group flex items-center gap-1.5 font-mono text-xs text-slate-500 transition hover:text-slate-300"
        >
          {shortAddress(address)}
          {copied ? (
            <CheckIcon className="h-3 w-3 text-emerald-400" />
          ) : (
            <CopyIcon className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
          )}
        </button>
      </div>

      <div className="text-right">
        <div className="text-sm font-semibold text-slate-100">{formatFiat(position.valueUsd, currency)}</div>
        <div className="text-xs text-slate-400">
          {formatTokenAmount(position.amount, position.decimals, 6)} {position.symbol}
        </div>
      </div>
    </div>
  );
}

function TokenRow({
  token,
  onRemove,
  currency,
}: {
  token: TokenPosition;
  onRemove?: () => void;
  currency: string;
}) {
  const style = ASSET_META[token.chain] ?? FALLBACK_STYLE;
  const up = token.change24hPct >= 0;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-slate-200">
        {token.symbol.slice(0, 3)}
        <span
          className={cx(
            'absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-[#0a0a12]',
            style.bg,
            style.ring,
          )}
        >
          {style.glyph}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-100">{token.symbol}</span>
          {token.priceUsd > 0 && (
            <span className={cx('text-xs font-medium', up ? 'text-emerald-400' : 'text-rose-400')}>
              {formatPercent(token.change24hPct)}
            </span>
          )}
        </div>
        <span className="truncate text-xs text-slate-500">{token.name}</span>
      </div>

      <div className="text-right">
        <div className="text-sm font-semibold text-slate-100">{formatFiat(token.valueUsd, currency)}</div>
        <div className="text-xs text-slate-400">
          {formatTokenAmount(token.amount, token.decimals, 4)} {token.symbol}
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove token"
          className="ml-1 rounded-md px-1.5 text-slate-600 transition hover:bg-rose-400/10 hover:text-rose-300"
        >
          ×
        </button>
      )}
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mt-2 h-9 w-40 rounded-lg bg-white/10" />
      <div className="mt-3 h-5 w-32 rounded-lg bg-white/10" />
      <div className="mt-4 h-24 w-full rounded-lg bg-white/5" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="h-10 w-10 rounded-xl bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="h-2.5 w-32 rounded bg-white/5" />
      </div>
      <div className="space-y-2 text-right">
        <div className="ml-auto h-3 w-16 rounded bg-white/10" />
        <div className="ml-auto h-2.5 w-12 rounded bg-white/5" />
      </div>
    </div>
  );
}
