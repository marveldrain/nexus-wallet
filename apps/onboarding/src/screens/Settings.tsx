import { cx } from '../lib';
import {
  AUTO_LOCK_OPTIONS,
  CURRENCY_SYMBOLS,
  SUPPORTED_FIAT_CURRENCIES,
  WIPE_AFTER_ATTEMPTS_OPTIONS,
  type AutoLockMinutes,
  type FiatCurrency,
  type WipeAfterAttempts,
} from '../data/settings';
import { useOnboarding } from '../store';
import type { NetworkMode } from '../data/settings';
import { Button, Card, Screen, ScreenHeader } from '../ui';

const CURRENCY_NAMES: Record<FiatCurrency, string> = {
  usd: 'US Dollar',
  eur: 'Euro',
  gbp: 'British Pound',
  jpy: 'Japanese Yen',
  cad: 'Canadian Dollar',
  aud: 'Australian Dollar',
  inr: 'Indian Rupee',
};

function autoLockLabel(minutes: AutoLockMinutes): string {
  return minutes === 0 ? 'Never' : `${minutes} min`;
}

function wipeLabel(value: WipeAfterAttempts): string {
  return value === null ? 'Off' : `${value} attempts`;
}

export function Settings() {
  const {
    fiatCurrency,
    setFiatCurrency,
    autoLockMinutes,
    setAutoLockMinutes,
    lockOnBlur,
    setLockOnBlur,
    wipeAfterAttempts,
    setWipeAfterAttempts,
    networkMode,
    setNetworkMode,
    keyring,
    go,
  } = useOnboarding();

  return (
    <Screen>
      <ScreenHeader title="Settings" onBack={() => go('dashboard')} />

      <Card>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          Display currency
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_FIAT_CURRENCIES.map((code) => {
            const active = code === fiatCurrency;
            return (
              <button
                key={code}
                onClick={() => setFiatCurrency(code)}
                className={cx(
                  'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition',
                  active
                    ? 'border-violet-400/50 bg-violet-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                )}
              >
                <span className="w-6 text-center text-sm font-semibold">{CURRENCY_SYMBOLS[code]}</span>
                <div>
                  <div className="text-xs font-semibold uppercase">{code}</div>
                  <div className="text-[11px] text-slate-500">{CURRENCY_NAMES[code]}</div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Balances and prices are shown in this currency. Your assets themselves don&apos;t change —
          only how their value is displayed.
        </p>
      </Card>

      {keyring && (
        <>
          <div className="mt-4">
            <Card>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Network
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['mainnet', 'testnet'] as NetworkMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setNetworkMode(mode)}
                    className={cx(
                      'rounded-xl border px-3 py-2.5 text-center text-sm font-semibold capitalize transition',
                      mode === networkMode
                        ? mode === 'testnet'
                          ? 'border-amber-400/50 bg-amber-500/10 text-amber-200'
                          : 'border-violet-400/50 bg-violet-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                    )}
                  >
                    {mode === 'testnet' ? '🧪 Testnet' : mode}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Testnet mode switches to Bitcoin testnet3, Ethereum Sepolia, and Solana devnet —
                free test networks for trying real sends without risking real funds. Your testnet
                Bitcoin address is separate from your mainnet one; Ethereum and Solana reuse the
                same address. Watching other addresses always stays on mainnet.
              </p>
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Auto-lock
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {AUTO_LOCK_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => setAutoLockMinutes(minutes)}
                    className={cx(
                      'rounded-lg border px-1 py-2 text-center text-xs font-medium transition',
                      minutes === autoLockMinutes
                        ? 'border-violet-400/50 bg-violet-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                    )}
                  >
                    {autoLockLabel(minutes)}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Lock the wallet automatically after this much idle time.
              </p>

              <label className="mt-4 flex cursor-pointer items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm text-slate-200">Lock when this tab loses focus</span>
                <input
                  type="checkbox"
                  checked={lockOnBlur}
                  onChange={(e) => setLockOnBlur(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 accent-violet-500"
                />
              </label>
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Wipe after failed attempts
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {WIPE_AFTER_ATTEMPTS_OPTIONS.map((value) => (
                  <button
                    key={String(value)}
                    onClick={() => setWipeAfterAttempts(value)}
                    className={cx(
                      'rounded-lg border px-1 py-2 text-center text-xs font-medium transition',
                      value === wipeAfterAttempts
                        ? 'border-violet-400/50 bg-violet-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                    )}
                  >
                    {wipeLabel(value)}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-amber-300/80">
                ⚠️ Destructive. Erases this device&apos;s wallet data after that many consecutive
                wrong passwords — protects against someone trying to brute-force an unlocked
                device, but only enable it if your recovery phrase is safely backed up elsewhere.
              </p>
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Wallet security
              </p>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full" onClick={() => go('change-password')}>
                  Change password
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => go('reveal-seed')}>
                  Reveal recovery phrase
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </Screen>
  );
}
