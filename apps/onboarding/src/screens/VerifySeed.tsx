import { useMemo, useState } from 'react';
import { cx, pickRandomIndices } from '../lib';
import { useOnboarding } from '../store';
import { Button, Card, CheckIcon, Screen, Stepper } from '../ui';

interface Challenge {
  position: number; // 0-based index into the mnemonic
  options: string[];
  answer: string;
}

function buildChallenges(words: string[]): Challenge[] {
  const positions = pickRandomIndices(words.length, 3);
  return positions.map((position) => {
    const answer = words[position]!;
    // Two distractors drawn from other words in the phrase.
    const distractors = pickRandomIndices(words.length, 6)
      .map((i) => words[i]!)
      .filter((w) => w !== answer)
      .slice(0, 2);
    const options = [answer, ...distractors].sort(() => Math.random() - 0.5);
    return { position, options, answer };
  });
}

export function VerifySeed() {
  const { mnemonic, finishCreate, go, busy, error } = useOnboarding();
  const words = useMemo(() => (mnemonic ?? '').split(' '), [mnemonic]);
  const challenges = useMemo(() => buildChallenges(words), [words]);
  const [picks, setPicks] = useState<Record<number, string>>({});

  const allAnswered = challenges.every((c) => picks[c.position] !== undefined);
  const allCorrect = challenges.every((c) => picks[c.position] === c.answer);

  return (
    <Screen>
      <Card>
        <Stepper current={2} total={3} />
        <h2 className="text-2xl font-bold">Verify your backup</h2>
        <p className="mt-2 text-sm text-slate-400">
          Confirm you saved the phrase by selecting the correct word for each position.
        </p>

        <div className="mt-6 space-y-5">
          {challenges.map((c) => {
            const picked = picks[c.position];
            const wrong = picked !== undefined && picked !== c.answer;
            return (
              <div key={c.position}>
                <p className="mb-2 text-xs font-medium text-slate-400">
                  Word #{c.position + 1}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {c.options.map((opt) => {
                    const selected = picked === opt;
                    const correct = selected && opt === c.answer;
                    return (
                      <button
                        key={opt}
                        onClick={() => setPicks((p) => ({ ...p, [c.position]: opt }))}
                        className={cx(
                          'flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                          !selected && 'border-white/10 bg-white/5 text-slate-200 hover:border-white/25',
                          correct && 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200',
                          selected && !correct && 'border-red-400/50 bg-red-400/10 text-red-200',
                        )}
                      >
                        {correct && <CheckIcon className="h-3.5 w-3.5" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {wrong && <p className="mt-1.5 text-xs text-red-400">Not quite — try again.</p>}
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="mt-7 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => go('reveal')} disabled={busy}>
            Back
          </Button>
          <Button
            className="flex-1"
            loading={busy}
            disabled={!allAnswered || !allCorrect}
            onClick={finishCreate}
          >
            {busy ? 'Securing wallet…' : 'Create wallet'}
          </Button>
        </div>
      </Card>
    </Screen>
  );
}
