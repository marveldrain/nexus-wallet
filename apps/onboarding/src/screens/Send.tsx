import { useEffect, useMemo, useState } from 'react';
import { parseBtcToSats, parseEvmAmount, parseSolToLamports } from '@nexus/tx-builder';
import { formatFiat, formatTokenAmount } from '@nexus/portfolio';
import { looksLikeEnsName, looksLikeSnsName, resolveEnsName, resolveSnsName } from '@nexus/chain-rpc';
import type { ChainId } from '@nexus/wallet-core';
import { cx, shortAddress } from '../lib';
import { isValidAddress } from '../data/address';
import { ASSET_META, EVM_NETWORKS, SEPOLIA } from '../data/networks';
import { RPC } from '../config';
import {
  getFeeOptions,
  signAndSend,
  type BroadcastResult,
  type FeeOption,
  type FeeTierId,
  type SendTarget,
} from '../data/send';
import { useOnboarding } from '../store';
import { Button, Card, CheckIcon, Screen, ScreenHeader } from '../ui';

interface SendableAsset {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  target: SendTarget;
  parse: (s: string) => bigint;
  /** Which derived account / address-format this asset uses. */
  validateChain: ChainId;
}

const SENDABLES_MAINNET: SendableAsset[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', decimals: 8, target: { kind: 'bitcoin' }, parse: parseBtcToSats, validateChain: 'bitcoin' },
  ...EVM_NETWORKS.map((net): SendableAsset => ({
    id: net.id,
    name: net.name,
    symbol: net.symbol,
    decimals: 18,
    target: { kind: 'evm', network: net },
    parse: parseEvmAmount,
    validateChain: 'ethereum',
  })),
  { id: 'solana', name: 'Solana', symbol: 'SOL', decimals: 9, target: { kind: 'solana' }, parse: parseSolToLamports, validateChain: 'solana' },
];

/** Exactly the 3 networks testnet mode supports — see data/send.ts's SendTarget. */
const SENDABLES_TESTNET: SendableAsset[] = [
  { id: 'bitcoin', name: 'Bitcoin (Testnet)', symbol: 'BTC', decimals: 8, target: { kind: 'bitcoin', testnet: true }, parse: parseBtcToSats, validateChain: 'bitcoin' },
  { id: 'sepolia', name: 'Sepolia', symbol: 'ETH', decimals: 18, target: { kind: 'evm', network: SEPOLIA }, parse: parseEvmAmount, validateChain: 'ethereum' },
  { id: 'solana', name: 'Solana (Devnet)', symbol: 'SOL', decimals: 9, target: { kind: 'solana', testnet: true }, parse: parseSolToLamports, validateChain: 'solana' },
];

type Phase = 'select' | 'form' | 'review' | 'sending' | 'done';

export function Send() {
  const { accounts, portfolio, keyring, contacts, fiatCurrency, networkMode, openContacts, go } =
    useOnboarding();
  const SENDABLES = networkMode === 'testnet' ? SENDABLES_TESTNET : SENDABLES_MAINNET;
  const [asset, setAsset] = useState<SendableAsset | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [phase, setPhase] = useState<Phase>('select');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [feeOptions, setFeeOptions] = useState<FeeOption[]>([]);
  const [feeTunable, setFeeTunable] = useState(false);
  const [feeTierId, setFeeTierId] = useState<FeeTierId>('avg');
  const [feeLoading, setFeeLoading] = useState(false);
  const [resolved, setResolved] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const positionFor = (id: string) => portfolio?.positions.find((p) => p.chain === id);

  // Name resolution: ENS ("vitalik.eth") for EVM assets, SNS ("bonfida.sol") for Solana.
  const isEnsInput = asset?.validateChain === 'ethereum' && looksLikeEnsName(recipient);
  const isSnsInput = asset?.validateChain === 'solana' && looksLikeSnsName(recipient);
  const isNameInput = isEnsInput || isSnsInput;
  useEffect(() => {
    setResolved(null);
    if (!isNameInput) return;
    let cancelled = false;
    setResolving(true);
    const t = setTimeout(() => {
      const lookup = isEnsInput ? resolveEnsName(RPC.ethereum, recipient.trim()) : resolveSnsName(recipient.trim());
      void lookup.then((addr) => {
        if (!cancelled) {
          setResolved(addr);
          setResolving(false);
        }
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [recipient, isNameInput, isEnsInput]);

  // Fetch live fee tiers whenever the chosen asset changes.
  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    setFeeLoading(true);
    setFeeOptions([]);
    setFeeTierId('avg');
    void getFeeOptions(asset.target).then(({ options, tunable }) => {
      if (!cancelled) {
        setFeeOptions(options);
        setFeeTunable(tunable);
        setFeeLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [asset]);

  const selectedFee = feeOptions.find((o) => o.id === feeTierId) ?? feeOptions[0] ?? null;
  const fromAddress = asset ? accounts.find((a) => a.chain === asset.validateChain)?.address ?? '' : '';
  const position = asset ? positionFor(asset.id) : undefined;
  const balance = position?.amount ?? 0n;
  const priceUsd = position?.priceUsd ?? 0;
  const feeBaseUnits = selectedFee?.estimate.baseUnits ?? 0n;
  const feeText =
    selectedFee && asset
      ? `${formatTokenAmount(selectedFee.estimate.baseUnits, selectedFee.estimate.decimals, 8)} ${asset.symbol}`
      : '…';

  const parsed = useMemo(() => {
    if (!asset || !amountStr) return null;
    try {
      return asset.parse(amountStr);
    } catch {
      return null;
    }
  }, [asset, amountStr]);

  const effectiveRecipient = isNameInput ? resolved ?? '' : recipient.trim();
  const recipientValid = asset
    ? isNameInput
      ? !!resolved
      : isValidAddress(asset.validateChain, recipient)
    : false;
  const overBalance = parsed !== null && selectedFee !== null && parsed + feeBaseUnits > balance;
  const canReview =
    recipientValid && !resolving && parsed !== null && parsed > 0n && selectedFee !== null && !overBalance;

  const contactChain = asset ? (asset.validateChain === 'ethereum' ? 'evm' : asset.validateChain) : null;
  const compatibleContacts = contactChain ? contacts.filter((c) => c.chain === contactChain) : [];

  function chooseAsset(a: SendableAsset) {
    setAsset(a);
    setRecipient('');
    setAmountStr('');
    setError(null);
    setPhase('form');
  }

  function setMax() {
    if (!asset || !selectedFee) return;
    const max = balance - selectedFee.estimate.baseUnits;
    setAmountStr(max > 0n ? formatTokenAmount(max, asset.decimals, asset.decimals) : '0');
  }

  async function confirm() {
    if (!keyring || !asset || parsed === null) return;
    setPhase('sending');
    setError(null);
    try {
      const res = await signAndSend(keyring, asset.target, effectiveRecipient, parsed, selectedFee ?? undefined);
      setResult(res);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the transaction.');
      setPhase('review');
    }
  }

  // --- select asset / network -------------------------------------------------
  if (phase === 'select' || !asset) {
    const sorted = [...SENDABLES].sort(
      (a, b) => (positionFor(b.id)?.valueUsd ?? 0) - (positionFor(a.id)?.valueUsd ?? 0),
    );
    return (
      <Screen>
        <ScreenHeader title="Send" onBack={() => go('dashboard')} />
        <p className="mb-3 px-1 text-xs text-slate-400">Choose an asset and network to send.</p>
        <div className="space-y-2.5">
          {sorted.map((a) => {
            const pos = positionFor(a.id);
            const meta = ASSET_META[a.id] ?? { glyph: a.symbol[0], ring: 'text-slate-200', bg: 'bg-white/10' };
            return (
              <button
                key={a.id}
                onClick={() => chooseAsset(a)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold', meta.bg, meta.ring)}>
                  {meta.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-100">{a.name}</div>
                  <div className="text-xs text-slate-500">{a.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-200">{formatFiat(pos?.valueUsd ?? 0, fiatCurrency)}</div>
                  <div className="text-xs text-slate-500">
                    {formatTokenAmount(pos?.amount ?? 0n, a.decimals, 6)} {a.symbol}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Screen>
    );
  }

  // --- success ----------------------------------------------------------------
  if (phase === 'done' && result) {
    return (
      <Screen>
        <Card className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
            <CheckIcon className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold">Transaction sent</h2>
          <p className="mt-1 text-sm text-slate-400">
            {amountStr} {asset.symbol} on {asset.name} to {shortAddress(effectiveRecipient)}
          </p>
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-left">
            <p className="text-xs text-slate-400">Transaction ID</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-200">{result.id}</p>
          </div>
          <a href={result.explorerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-medium text-violet-300 hover:underline">
            View on block explorer ↗
          </a>
          <Button className="mt-5 w-full" onClick={() => go('dashboard')}>
            Done
          </Button>
        </Card>
      </Screen>
    );
  }

  // --- review -----------------------------------------------------------------
  if (phase === 'review' || phase === 'sending') {
    const sending = phase === 'sending';
    return (
      <Screen>
        <ScreenHeader title="Review" onBack={() => setPhase('form')} />
        <Card>
          <Row label="Asset" value={`${asset.symbol} on ${asset.name}`} />
          <Row label="From" value={shortAddress(fromAddress)} mono />
          <Row
            label="To"
            value={isNameInput ? `${recipient.trim()} · ${shortAddress(effectiveRecipient)}` : shortAddress(recipient)}
            mono
          />
          <Divider />
          <Row label="Amount" value={`${amountStr} ${asset.symbol}`} strong />
          <Row
            label={feeTunable ? `Network fee (${selectedFee?.label ?? 'Average'})` : 'Network fee'}
            value={feeText}
          />
          {priceUsd > 0 && parsed !== null && (
            <Row label="≈ Value" value={formatFiat(Number(amountStr) * priceUsd, fiatCurrency)} muted />
          )}
          {error && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>
          )}
          <Button className="mt-6 w-full" loading={sending} onClick={confirm}>
            {sending ? 'Signing & broadcasting…' : 'Confirm & send'}
          </Button>
        </Card>
      </Screen>
    );
  }

  // --- form -------------------------------------------------------------------
  return (
    <Screen>
      <ScreenHeader title={`Send ${asset.symbol}`} onBack={() => setPhase('select')} />
      <Card>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
          <span className={ASSET_META[asset.id]?.ring}>{ASSET_META[asset.id]?.glyph}</span>
          <span className="font-medium">{asset.name}</span>
          <button onClick={() => setPhase('select')} className="ml-auto text-violet-300 hover:underline">
            Change
          </button>
        </div>

        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">Recipient address</label>
          <button onClick={openContacts} className="text-xs font-medium text-violet-300 hover:underline">
            Address book
          </button>
        </div>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          placeholder={
            asset.validateChain === 'ethereum'
              ? `${asset.name} address or name.eth`
              : asset.validateChain === 'solana'
                ? `${asset.name} address or name.sol`
                : `${asset.name} address`
          }
          className={cx(
            'w-full rounded-xl border bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2',
            recipient && !recipientValid && !resolving
              ? 'border-red-500/40 focus:ring-red-500/30'
              : 'border-white/10 focus:border-violet-400/50 focus:ring-violet-500/30',
          )}
        />
        {isNameInput ? (
          resolving ? (
            <p className="mt-1 text-xs text-slate-400">Resolving name…</p>
          ) : resolved ? (
            <p className="mt-1 text-xs text-emerald-400">→ {shortAddress(resolved)}</p>
          ) : (
            <p className="mt-1 text-xs text-red-400">Couldn’t resolve this name.</p>
          )
        ) : recipient && !recipientValid ? (
          <p className="mt-1 text-xs text-red-400">Not a valid {asset.name} address.</p>
        ) : null}

        {compatibleContacts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {compatibleContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setRecipient(c.address)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">Amount</label>
          <button onClick={setMax} className="text-xs font-medium text-violet-300 hover:underline">
            Max
          </button>
        </div>
        <div
          className={cx(
            'mt-1.5 flex items-center rounded-xl border bg-white/5 px-4 focus-within:ring-2',
            overBalance
              ? 'border-red-500/40 focus-within:ring-red-500/30'
              : 'border-white/10 focus-within:border-violet-400/50 focus-within:ring-violet-500/30',
          )}
        >
          <input
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
            inputMode="decimal"
            placeholder="0.00"
            className="w-full bg-transparent py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none"
          />
          <span className="text-sm font-semibold text-slate-400">{asset.symbol}</span>
        </div>
        <div className="mt-1 flex justify-between text-xs">
          <span className={overBalance ? 'text-red-400' : 'text-slate-500'}>
            {overBalance ? 'Exceeds balance + fee' : feeLoading ? 'Estimating network fee…' : `Fee ≈ ${feeText}`}
          </span>
          <span className="text-slate-500">
            Balance {formatTokenAmount(balance, asset.decimals, 6)} {asset.symbol}
          </span>
        </div>

        {feeTunable && feeOptions.length > 1 && (
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Network fee speed</label>
            <div className="grid grid-cols-3 gap-2">
              {feeOptions.map((opt) => {
                const active = opt.id === feeTierId;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFeeTierId(opt.id)}
                    className={cx(
                      'rounded-xl border px-2 py-2 text-center transition',
                      active
                        ? 'border-violet-400/50 bg-violet-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                    )}
                  >
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {formatTokenAmount(opt.estimate.baseUnits, opt.estimate.decimals, 6)} {asset.symbol}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Button className="mt-6 w-full" disabled={!canReview} onClick={() => setPhase('review')}>
          Review
        </Button>
      </Card>
    </Screen>
  );
}

function Row({ label, value, mono, strong, muted }: { label: string; value: string; mono?: boolean; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={cx('text-sm', mono && 'font-mono text-xs', strong ? 'font-semibold text-white' : muted ? 'text-slate-400' : 'text-slate-200')}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="my-2 h-px bg-white/10" />;
}
