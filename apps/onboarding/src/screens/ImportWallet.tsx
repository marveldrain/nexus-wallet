import { useMemo, useState } from 'react';
import { isValidMnemonic } from '@nexus/wallet-core';
import { estimatePasswordStrength } from '../lib';
import { useOnboarding } from '../store';
import { Button, Card, Screen } from '../ui';

export function ImportWallet() {
  const { importPhrase, go, busy, error } = useOnboarding();
  const [phrase, setPhrase] = useState('');
  const [pw, setPw] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [passphrase, setPassphrase] = useState('');

  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
  const wordCount = normalized ? normalized.split(' ').length : 0;
  const validLength = wordCount === 12 || wordCount === 24;
  const phraseValid = validLength && isValidMnemonic(normalized);
  const phraseTouched = phrase.trim().length > 0;
  const strength = useMemo(() => estimatePasswordStrength(pw), [pw]);

  const canImport = phraseValid && pw.length >= 8 && strength.score >= 2 && !busy;

  return (
    <Screen>
      <Card>
        <h2 className="text-2xl font-bold">Import a wallet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Enter your 12- or 24-word recovery phrase, separated by spaces.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <textarea
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              rows={4}
              spellCheck={false}
              autoComplete="off"
              placeholder="word1 word2 word3 …"
              className={`w-full resize-none rounded-xl border bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 ${
                phraseTouched && !phraseValid
                  ? 'border-red-500/40 focus:ring-red-500/30'
                  : 'border-white/10 focus:border-violet-400/50 focus:ring-violet-500/30'
              }`}
            />
            <div className="mt-1 flex justify-between text-xs">
              <span className={phraseTouched && !phraseValid ? 'text-red-400' : 'text-slate-500'}>
                {phraseTouched && !validLength
                  ? `${wordCount} words — need 12 or 24`
                  : phraseTouched && !phraseValid
                    ? 'Invalid phrase (check spelling & order)'
                    : 'Your phrase is never sent anywhere.'}
              </span>
              {phraseValid && <span className="text-emerald-400">✓ Valid phrase</span>}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              New device password
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Encrypts the wallet on this device"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            {pw.length > 0 && pw.length < 8 && (
              <p className="mt-1 text-xs text-red-400">Use at least 8 characters.</p>
            )}
          </div>

          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-medium text-slate-400 transition hover:text-slate-200"
            >
              <span>Advanced: I used a passphrase</span>
              <span className="text-base leading-none">{showAdvanced ? '−' : '+'}</span>
            </button>
            {showAdvanced && (
              <div className="mt-3">
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="BIP39 passphrase (25th word)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Only if your wallet was created with one — a wrong or blank value restores a
                  different wallet.
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="mt-7 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => go('welcome')} disabled={busy}>
            Back
          </Button>
          <Button
            className="flex-1"
            loading={busy}
            disabled={!canImport}
            onClick={() => importPhrase(normalized, pw, passphrase)}
          >
            {busy ? 'Restoring…' : 'Import wallet'}
          </Button>
        </div>
      </Card>
    </Screen>
  );
}
