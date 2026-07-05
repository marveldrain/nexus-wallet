import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from './lib';

/** Brand mark — the Nexus crystal "N" (public/logo.png), with an SVG fallback. */
export function Logo({ size = 40 }: { size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!imgFailed) {
    return (
      <img
        src="/logo.png"
        width={size}
        height={size}
        alt="Nexus"
        className="rounded-[22%] object-contain"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return <CrystalFallback size={size} />;
}

/** Inline SVG crystal used until logo.png is in place. */
function CrystalFallback({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Nexus"
    >
      <defs>
        <linearGradient id="nx-l" x1="8" y1="8" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c084fc" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="nx-d" x1="16" y1="8" x2="34" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="nx-r" x1="32" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="nx-sh" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#c7d2fe" />
        </linearGradient>
        <filter id="nx-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <g opacity="0.4" filter="url(#nx-glow)">
        <path d="M8 8H16V40H8z" fill="#7c3aed" />
        <path d="M16 8H25L33 40H24z" fill="#6d28d9" />
        <path d="M32 8H40V40H32z" fill="#4f46e5" />
      </g>

      {/* N strokes (left bar, diagonal, right bar) */}
      <path d="M8 8H16V40H8z" fill="url(#nx-l)" />
      <path d="M16 8H25L33 40H24z" fill="url(#nx-d)" />
      <path d="M32 8H40V40H32z" fill="url(#nx-r)" />

      {/* Bevel highlights along the top edges */}
      <path
        d="M8 8H16M16 8H25M32 8H40"
        stroke="#ede9fe"
        strokeOpacity="0.5"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Crystal shards */}
      <path d="M28 12l2.4 2-0.6 6.5-2.4-2z" fill="url(#nx-sh)" opacity="0.9" />
      <path d="M22 27l2.6 2.2-0.5 7-2.7-2.4z" fill="url(#nx-sh)" opacity="0.85" />
      <path d="M19 33l1.6 1.3-0.4 3.7-1.6-1.4z" fill="url(#nx-sh)" opacity="0.7" />
    </svg>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'subtle';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'relative inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 disabled:cursor-not-allowed disabled:opacity-50';
  const variants = {
    primary:
      'gradient-btn text-white shadow-lg shadow-violet-900/40 hover:shadow-violet-700/50 hover:brightness-110 active:scale-[0.98]',
    ghost: 'border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 active:scale-[0.98]',
    subtle: 'text-slate-300 hover:text-white',
  };
  return (
    <button className={cx(base, variants[variant], className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner />}
      <span className={cx(loading && 'opacity-80')}>{children}</span>
    </button>
  );
}

export function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('glass w-full p-8 animate-fade-up', className)}>{children}</div>;
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

/** Step progress indicator for the create flow. */
export function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cx(
            'h-1 flex-1 rounded-full transition-colors duration-500',
            i <= current ? 'bg-gradient-to-r from-violet-400 to-fuchsia-400' : 'bg-white/10',
          )}
        />
      ))}
    </div>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V5l8-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.5 12l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReceiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M12 19l-6-6M12 19l6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M19.4 13a7.6 7.6 0 0 0 0-2l1.9-1.5-2-3.4-2.3.6a7.6 7.6 0 0 0-1.7-1l-.3-2.4H9l-.3 2.4a7.6 7.6 0 0 0-1.7 1l-2.3-.6-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-1.9 1.5 2 3.4 2.3-.6a7.6 7.6 0 0 0 1.7 1l.3 2.4h4l.3-2.4a7.6 7.6 0 0 0 1.7-1l2.3.6 2-3.4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M5 18a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A back-arrow header used by the send/receive sub-screens. */
export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-5 flex items-center gap-3 animate-fade-up">
      <button
        onClick={onBack}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
        aria-label="Back"
      >
        <BackIcon className="h-5 w-5" />
      </button>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

/** Dependency-free SVG area/sparkline chart for the portfolio value series. */
export function AreaChart({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return <div className="h-24" />;

  const w = 100;
  const h = 40;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (v - min) / range) * (h - 2 * pad);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const area = `${line} L${last[0].toFixed(2)},${h} L${first[0].toFixed(2)},${h} Z`;
  const color = positive ? '#34d399' : '#fb7185';
  const gradId = positive ? 'chart-pos' : 'chart-neg';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
