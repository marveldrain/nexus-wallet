import { useState } from 'react';
import { copyToClipboardSensitive, cx } from '../lib';
import { useOnboarding } from '../store';
import { Button, Card, CheckIcon, CopyIcon, Screen, ScreenHeader } from '../ui';

export function RevealSeedSettings() {
  const { revealSeed, go } = useOnboarding();
  const [password, setPassword] = useState('');
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [revealedWords, setRevealedWords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    const result = await revealSeed(password);
    setBusy(false);
    if (!result) {
      setError('Incorrect password.');
      return;
    }
    setMnemonic(result);
    setPassword('');
  }

  function handleDone() {
    setMnemonic(null);
    setRevealedWords(false);
    go('settings');
  }

  async function handleCopy() {
    if (!mnemonic) return;
    if (await copyToClipboardSensitive(mnemonic)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  if (!mnemonic) {
    return (
      <Screen>
        <ScreenHeader title="Reveal recovery phrase" onBack={() => go('settings')} />
        <Card>
          <p className="text-sm text-slate-400">
            Enter your password to view your recovery phrase. Anyone who sees it can take your
            funds — make sure no one is watching.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password) void handleSubmit();
            }}
          >
            <label className="mb-1.5 mt-5 block text-xs font-medium text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your device password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <Button type="submit" className="mt-5 w-full" loading={busy} disabled={!password}>
              {busy ? 'Verifying…' : 'Reveal'}
            </Button>
          </form>
        </Card>
      </Screen>
    );
  }

  const words = mnemonic.split(' ');

  return (
    <Screen>
      <ScreenHeader title="Your recovery phrase" onBack={handleDone} />
      <Card>
        <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-200">
          ⚠️ Never share these words. Anyone who has them can take your funds.
        </div>

        <div className="relative">
          <div
            className={cx(
              'grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 transition',
              !revealedWords && 'blur-md select-none',
            )}
          >
            {words.map((word, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-sm">
                <span className="w-5 text-right font-mono text-xs text-slate-500">{i + 1}</span>
                <span className="font-medium text-slate-100">{word}</span>
              </div>
            ))}
          </div>
          {!revealedWords && (
            <button
              onClick={() => setRevealedWords(true)}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/40 text-slate-200 backdrop-blur-sm transition hover:bg-black/30"
            >
              <span className="text-sm font-semibold">Tap to reveal</span>
              <span className="text-xs text-slate-400">Make sure no one is watching</span>
            </button>
          )}
        </div>

        {revealedWords && (
          <button
            onClick={handleCopy}
            className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-slate-200"
          >
            {copied ? <CheckIcon className="h-4 w-4 text-emerald-400" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? 'Copied — clipboard clears automatically' : 'Copy phrase'}
          </button>
        )}

        <Button className="mt-6 w-full" onClick={handleDone}>
          Done
        </Button>
      </Card>
    </Screen>
  );
}
