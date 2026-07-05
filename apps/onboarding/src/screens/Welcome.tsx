import { useOnboarding } from '../store';
import { Button, Card, Logo, Screen, ShieldIcon } from '../ui';

export function Welcome() {
  const { startCreate, startImport, startWatch, notice, clearNotice } = useOnboarding();
  return (
    <Screen>
      <div className="mb-8 flex flex-col items-center text-center animate-fade-up">
        <Logo size={64} />
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight">
          <span className="gradient-text">Nexus</span> Wallet
        </h1>
        <p className="mt-3 max-w-sm text-balance text-slate-400">
          One beautiful, self-custodial home for Bitcoin, Ethereum &amp; Solana. Your keys never
          leave this device.
        </p>
      </div>

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-200">
          <span className="flex-1">{notice}</span>
          <button onClick={clearNotice} className="shrink-0 text-amber-300/70 hover:text-amber-200">
            ✕
          </button>
        </div>
      )}

      <Card>
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-emerald-300">
          <ShieldIcon className="h-5 w-5 shrink-0" />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Non-custodial.</span> We never see or store your secret
            phrase. Only you can access your funds.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={startCreate}>Create a new wallet</Button>
          <Button variant="ghost" onClick={startImport}>
            I already have a recovery phrase
          </Button>
        </div>

        <button
          onClick={startWatch}
          className="mt-4 w-full text-center text-xs font-medium text-slate-400 transition hover:text-slate-200"
        >
          👁 Watch an address (read-only)
        </button>
      </Card>

      <p className="mt-6 text-center text-xs text-slate-500">
        By continuing you agree to keep your recovery phrase safe. Nexus cannot recover it for you.
      </p>
    </Screen>
  );
}
