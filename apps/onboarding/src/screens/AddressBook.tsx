import { useMemo, useState } from 'react';
import { cx, shortAddress } from '../lib';
import { CONTACT_CHAIN_META, detectContactChain } from '../data/contacts';
import { useOnboarding } from '../store';
import { Button, Card, Screen, ScreenHeader } from '../ui';

export function AddressBook() {
  const { contacts, addContact, removeContact, go } = useOnboarding();
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');

  const detected = useMemo(() => detectContactChain(address), [address]);
  const addressTouched = address.trim().length > 0;
  const canAdd = label.trim().length > 0 && detected !== null;

  function handleAdd() {
    if (!canAdd || !detected) return;
    addContact(label, address, detected);
    setLabel('');
    setAddress('');
  }

  return (
    <Screen>
      <ScreenHeader title="Address book" onBack={() => go('dashboard')} />

      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Add a contact</p>
        <div className="mt-3 space-y-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Coinbase, Mom)"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="Address (BTC, EVM, or Solana)"
            className={cx(
              'w-full rounded-xl border bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2',
              addressTouched && !detected
                ? 'border-red-500/40 focus:ring-red-500/30'
                : 'border-white/10 focus:border-violet-400/50 focus:ring-violet-500/30',
            )}
          />
          <div className="flex h-4 items-center text-xs">
            {addressTouched && !detected && <span className="text-red-400">Unrecognized address format</span>}
            {detected && (
              <span className="text-emerald-400">Detected: {CONTACT_CHAIN_META[detected].label}</span>
            )}
          </div>
          <Button className="w-full" disabled={!canAdd} onClick={handleAdd}>
            Add contact
          </Button>
        </div>
      </Card>

      <div className="mt-4">
        <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Saved ({contacts.length})
        </p>
        {contacts.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-slate-400">No contacts yet. Add one above.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {contacts.map((c) => {
              const meta = CONTACT_CHAIN_META[c.chain];
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold', meta.bg, meta.ring)}>
                    {meta.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-100">{c.label}</div>
                    <div className="font-mono text-xs text-slate-500">{shortAddress(c.address, 8, 6)}</div>
                  </div>
                  <button
                    onClick={() => removeContact(c.id)}
                    className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Screen>
  );
}
