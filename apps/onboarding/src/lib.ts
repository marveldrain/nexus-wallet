/** UI helpers: className merge, address formatting, clipboard, password strength. */

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Shorten an address for display: 0x1234…cdef */
export function shortAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy sensitive text (recovery phrase, private key) and best-effort clear the
 * clipboard again after `clearAfterMs`, shrinking the window malware or an
 * unlocked, walked-away-from device has to read it. We don't verify the
 * clipboard still holds what we wrote (reading it back would need an extra
 * permission prompt in most browsers) — it's a courtesy clear, not a guarantee.
 */
export async function copyToClipboardSensitive(text: string, clearAfterMs = 30_000): Promise<boolean> {
  const ok = await copyToClipboard(text);
  if (ok) {
    setTimeout(() => {
      void navigator.clipboard.writeText('').catch(() => undefined);
    }, clearAfterMs);
  }
  return ok;
}

export interface PasswordStrength {
  /** 0 (weakest) … 4 (strongest) */
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  /** Rough Shannon-style entropy estimate in bits. */
  bits: number;
}

/**
 * Lightweight password strength heuristic (no dependency). PRODUCTION NOTE:
 * swap in `zxcvbn` for dictionary/pattern-aware scoring before launch.
 */
export function estimatePasswordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: 'Very weak', bits: 0 };

  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;

  let bits = pw.length * Math.log2(pool || 1);

  // Penalize obvious repetition / sequences.
  if (/(.)\1\1/.test(pw)) bits *= 0.7;
  if (/^(?:password|qwerty|12345|letmein|admin)/i.test(pw)) bits *= 0.3;

  const score: PasswordStrength['score'] =
    bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  const label = (['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'] as const)[score];
  return { score, label, bits: Math.round(bits) };
}

/** Compact relative time, e.g. "3m", "5h", "2d", "Jan 4". */
export function timeAgo(unixSeconds: number | null): string {
  if (!unixSeconds) return 'Pending';
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Pick `count` distinct random indices in [0, length). */
export function pickRandomIndices(length: number, count: number): number[] {
  const pool = Array.from({ length }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}
