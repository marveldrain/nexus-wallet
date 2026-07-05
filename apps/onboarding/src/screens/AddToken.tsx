import { useEffect, useState } from 'react';
import { getErc20TokenInfo, type TokenBalance } from '@nexus/chain-rpc';
import { formatTokenAmount } from '@nexus/portfolio';
import { isAddress } from 'viem';
import { useOnboarding } from '../store';
import { RPC } from '../config';
import { Button, Card, Screen, ScreenHeader } from '../ui';

export function AddToken() {
  const { accounts, addCustomToken, go } = useOnboarding();
  const ethAddress = accounts.find((a) => a.chain === 'ethereum')?.address ?? '';
  const [contract, setContract] = useState('');
  const [preview, setPreview] = useState<TokenBalance | null>(null);
  const [looking, setLooking] = useState(false);
  const [adding, setAdding] = useState(false);

  const validContract = isAddress(contract.trim());

  // Live-preview the token whenever a valid contract is entered.
  useEffect(() => {
    setPreview(null);
    if (!validContract || !ethAddress) return;
    let cancelled = false;
    setLooking(true);
    const t = setTimeout(() => {
      void getErc20TokenInfo(RPC.ethereum, contract.trim(), ethAddress).then((info) => {
        if (!cancelled) {
          setPreview(info);
          setLooking(false);
        }
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [contract, validContract, ethAddress]);

  async function handleAdd() {
    if (!preview) return;
    setAdding(true);
    await addCustomToken(contract.trim());
    go('dashboard');
  }

  return (
    <Screen>
      <ScreenHeader title="Add a token" onBack={() => go('dashboard')} />
      <Card>
        <p className="text-sm text-slate-400">
          Paste an ERC-20 contract address (Ethereum) to track a token your wallet doesn&apos;t
          auto-detect.
        </p>

        <label className="mb-1.5 mt-5 block text-xs font-medium text-slate-400">
          Token contract address
        </label>
        <input
          value={contract}
          onChange={(e) => setContract(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          placeholder="0x…"
          className={`w-full rounded-xl border bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 ${
            contract && !validContract
              ? 'border-red-500/40 focus:ring-red-500/30'
              : 'border-white/10 focus:border-violet-400/50 focus:ring-violet-500/30'
          }`}
        />

        <div className="mt-3 min-h-[3.25rem]">
          {contract && !validContract && (
            <p className="text-xs text-red-400">Not a valid contract address.</p>
          )}
          {looking && <p className="text-xs text-slate-400">Looking up token…</p>}
          {validContract && !looking && !preview && (
            <p className="text-xs text-red-400">No ERC-20 token found at this address.</p>
          )}
          {preview && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  {preview.symbol} <span className="text-slate-500">· {preview.name}</span>
                </div>
                <div className="text-xs text-slate-400">
                  Balance: {formatTokenAmount(preview.amount, preview.decimals, 6)} {preview.symbol}
                </div>
              </div>
              <span className="text-emerald-400">✓</span>
            </div>
          )}
        </div>

        <Button className="mt-4 w-full" disabled={!preview || adding} loading={adding} onClick={handleAdd}>
          {adding ? 'Adding…' : 'Add token'}
        </Button>
      </Card>
    </Screen>
  );
}
