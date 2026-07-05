import { useState } from 'react';
import { cx, shortAddress } from '../lib';
import { useOnboarding } from '../store';
import { Button, Card, CheckIcon, Screen, ScreenHeader } from '../ui';

export function Accounts() {
  const { accountList, accountIndex, keyring, switchAccount, createAccount, renameAccount, go } =
    useOnboarding();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [creating, setCreating] = useState(false);

  function startEdit(index: number, currentName: string) {
    setEditingIndex(index);
    setEditValue(currentName);
  }

  function saveEdit() {
    if (editingIndex !== null) renameAccount(editingIndex, editValue);
    setEditingIndex(null);
  }

  function handleCreate() {
    setCreating(true);
    // Deriving + an initial balance fetch is fast but async; the button shows
    // a brief loading state so it's clear something happened.
    createAccount();
    setTimeout(() => setCreating(false), 400);
  }

  return (
    <Screen>
      <ScreenHeader title="Accounts" onBack={() => go('dashboard')} />

      <div className="space-y-2.5">
        {accountList.map((acct) => {
          const active = acct.index === accountIndex;
          const previewAddress = keyring?.deriveAddress('ethereum', acct.index) ?? '';
          const editing = editingIndex === acct.index;

          return (
            <Card key={acct.index} className="!p-3">
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                    active ? 'bg-violet-500/20 text-violet-200' : 'bg-white/10 text-slate-300',
                  )}
                >
                  {acct.index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  {editing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      onBlur={saveEdit}
                      className="w-full rounded-lg border border-violet-400/50 bg-white/5 px-2 py-1 text-sm text-white focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(acct.index, acct.name)}
                      className="text-left text-sm font-semibold text-slate-100 hover:underline"
                    >
                      {acct.name}
                    </button>
                  )}
                  <div className="font-mono text-xs text-slate-500">{shortAddress(previewAddress)}</div>
                </div>

                {active ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                ) : (
                  <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => switchAccount(acct.index)}>
                    Switch
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Button variant="ghost" className="mt-4 w-full" loading={creating} onClick={handleCreate}>
        + Add account
      </Button>

      <p className="mt-4 text-center text-xs text-slate-500">
        Every account shares the same recovery phrase — back it up once, all accounts are covered.
      </p>
    </Screen>
  );
}
