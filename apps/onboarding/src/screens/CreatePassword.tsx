import { useMemo, useState } from 'react';
import { estimatePasswordStrength } from '../lib';
import { useOnboarding } from '../store';
import { Button, Card, Screen, Stepper } from '../ui';

const STRENGTH_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];

export function CreatePassword() {
  const { setPassword, setPassphrase, beginReveal, go } = useOnboarding();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [passphrase, setPassphraseInput] = useState('');

  const strength = useMemo(() => estimatePasswordStrength(pw), [pw]);
  const tooShort = pw.length > 0 && pw.length < 8;
  const mismatch = confirm.length > 0 && confirm !== pw;
  const canContinue = pw.length >= 8 && pw === confirm && agree && strength.score >= 2;

  function handleContinue() {
    setPassword(pw);
    setPassphrase(passphrase);
    beginReveal();
  }

  return (
    <Screen>
      <Card>
        <Stepper current={0} total={3} />
        <h2 className="text-2xl font-bold">Create a password</h2>
        <p className="mt-2 text-sm text-slate-400">
          This password encrypts your wallet on this device. It is not your recovery phrase and
          can&apos;t be reset.
        </p>

        <div className="mt-6 space-y-4">
          <Field
            label="Password"
            type="password"
            value={pw}
            onChange={setPw}
            placeholder="At least 8 characters"
            autoFocus
          />

          {pw.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i <= strength.score ? STRENGTH_COLORS[strength.score] : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Strength: <span className="font-medium text-slate-200">{strength.label}</span>
                <span className="text-slate-500"> · ~{strength.bits} bits</span>
              </p>
            </div>
          )}

          <Field
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter your password"
            error={mismatch ? 'Passwords do not match' : tooShort ? 'Use at least 8 characters' : undefined}
          />

          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-violet-500"
            />
            <span>
              I understand Nexus cannot recover this password or my funds if I lose my recovery
              phrase.
            </span>
          </label>

          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-medium text-slate-400 transition hover:text-slate-200"
            >
              <span>Advanced: add a passphrase (optional)</span>
              <span className="text-base leading-none">{showAdvanced ? '−' : '+'}</span>
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-2">
                <Field
                  label="BIP39 passphrase (25th word)"
                  type="password"
                  value={passphrase}
                  onChange={setPassphraseInput}
                  placeholder="Optional — creates a hidden wallet"
                />
                <p className="text-xs leading-relaxed text-amber-300/80">
                  A passphrase derives a separate hidden wallet. If you forget it, those funds are
                  unrecoverable — even with your recovery phrase.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-7 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => go('welcome')}>
            Back
          </Button>
          <Button className="flex-1" disabled={!canContinue} onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </Card>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500/50 focus:ring-red-500/40'
            : 'border-white/10 focus:border-violet-400/50 focus:ring-violet-500/30'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
