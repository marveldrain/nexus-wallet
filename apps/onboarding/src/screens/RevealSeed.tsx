import { useState } from 'react';
import { copyToClipboardSensitive, cx } from '../lib';
import { useOnboarding } from '../store';
import { Button, Card, CopyIcon, Screen, Stepper } from '../ui';

export function RevealSeed() {
  const { mnemonic, go } = useOnboarding();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const words = (mnemonic ?? '').split(' ');

  async function handleCopy() {
    if (!mnemonic) return;
    if (await copyToClipboardSensitive(mnemonic)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <Screen>
      <Card>
        <Stepper current={1} total={3} />
        <h2 className="text-2xl font-bold">Your recovery phrase</h2>
        <p className="mt-2 text-sm text-slate-400">
          These 24 words are the <span className="font-semibold text-slate-200">only</span> way to
          recover your wallet. Write them down in order and store them offline.
        </p>

        <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-200">
          ⚠️ Never share these words. Anyone who has them can take your funds. Nexus support will
          never ask for them.
        </div>

        <div className="relative mt-5">
          <div
            className={cx(
              'grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 transition',
              !revealed && 'blur-md select-none',
            )}
          >
            {words.map((word, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-sm"
              >
                <span className="w-5 text-right font-mono text-xs text-slate-500">{i + 1}</span>
                <span className="font-medium text-slate-100">{word}</span>
              </div>
            ))}
          </div>

          {!revealed && (
            <button
              onClick={() => setRevealed(true)}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/40 text-slate-200 backdrop-blur-sm transition hover:bg-black/30"
            >
              <EyeIcon className="h-7 w-7" />
              <span className="text-sm font-semibold">Tap to reveal</span>
              <span className="text-xs text-slate-400">Make sure no one is watching</span>
            </button>
          )}
        </div>

        {revealed && (
          <button
            onClick={handleCopy}
            className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-slate-200"
          >
            <CopyIcon className="h-4 w-4" />
            {copied ? 'Copied to clipboard' : 'Copy phrase'}
          </button>
        )}

        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={confirmedSaved}
            disabled={!revealed}
            onChange={(e) => setConfirmedSaved(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-violet-500 disabled:opacity-40"
          />
          <span>I have written down my recovery phrase and stored it safely.</span>
        </label>

        <div className="mt-6 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => go('create-password')}>
            Back
          </Button>
          <Button className="flex-1" disabled={!confirmedSaved} onClick={() => go('verify')}>
            Continue
          </Button>
        </div>
      </Card>
    </Screen>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
