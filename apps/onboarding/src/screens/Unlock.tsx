import { useState } from 'react';
import { useOnboarding } from '../store';
import { Button, Card, Logo, Screen } from '../ui';

export function Unlock() {
  const { unlock, reset, busy, error, unlockAttempts } = useOnboarding();
  const [pw, setPw] = useState('');

  return (
    <Screen>
      <div className="mb-8 flex flex-col items-center text-center animate-fade-up">
        <Logo size={56} />
        <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">Enter your password to unlock Nexus.</p>
      </div>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pw) unlock(pw);
          }}
        >
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
          <input
            type="password"
            value={pw}
            autoFocus
            onChange={(e) => setPw(e.target.value)}
            placeholder="Your device password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {error}
              {unlockAttempts >= 3 && ' Repeated attempts are being slowed down.'}
            </p>
          )}

          <Button type="submit" className="mt-5 w-full" loading={busy} disabled={!pw}>
            {busy ? 'Unlocking…' : 'Unlock'}
          </Button>
        </form>

        <button
          onClick={reset}
          className="mt-4 w-full text-center text-xs text-slate-500 transition hover:text-slate-300"
        >
          Forgot password? Reset with your recovery phrase
        </button>
      </Card>
    </Screen>
  );
}
