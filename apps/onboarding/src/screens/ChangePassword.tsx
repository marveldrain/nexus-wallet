import { useMemo, useState } from 'react';
import { estimatePasswordStrength } from '../lib';
import { useOnboarding } from '../store';
import { Button, Card, Screen, ScreenHeader } from '../ui';

const STRENGTH_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];

export function ChangePassword() {
  const { changePassword, busy, error, go } = useOnboarding();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const strength = useMemo(() => estimatePasswordStrength(next), [next]);
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm && strength.score >= 2 && !busy;

  return (
    <Screen>
      <ScreenHeader title="Change password" onBack={() => go('settings')} />
      <Card>
        <p className="text-sm text-slate-400">
          This changes the password that encrypts your wallet on this device. It does not change
          your recovery phrase.
        </p>

        <div className="mt-5 space-y-4">
          <Field label="Current password" type="password" value={current} onChange={setCurrent} autoFocus />

          <Field label="New password" type="password" value={next} onChange={setNext} placeholder="At least 8 characters" />
          {next.length > 0 && (
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
              </p>
            </div>
          )}

          <Field
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            error={mismatch ? 'Passwords do not match' : undefined}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </p>
        )}

        <Button
          className="mt-6 w-full"
          loading={busy}
          disabled={!canSubmit}
          onClick={() => changePassword(current, next)}
        >
          {busy ? 'Updating…' : 'Change password'}
        </Button>
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
