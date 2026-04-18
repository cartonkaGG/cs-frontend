"use client";

type HudTheme = {
  main: string;
  dim: string;
  segments: number;
  outerR: number;
  innerR: number;
  strokeOuter: number;
  strokeInner: number;
  outerSec: number;
  innerSec: number;
  innerReverse: boolean;
  microR?: number;
  microSec?: number;
};

const THEMES: HudTheme[] = [
  {
    main: "#FACC15",
    dim: "#A16207",
    segments: 3,
    outerR: 40,
    innerR: 29,
    strokeOuter: 3.2,
    strokeInner: 2.2,
    outerSec: 14,
    innerSec: 9,
    innerReverse: true,
  },
  {
    main: "#22D3EE",
    dim: "#0E7490",
    segments: 3,
    outerR: 40,
    innerR: 30,
    strokeOuter: 2.6,
    strokeInner: 2,
    outerSec: 11,
    innerSec: 8,
    innerReverse: false,
  },
  {
    main: "#34D399",
    dim: "#047857",
    segments: 4,
    outerR: 41,
    innerR: 28,
    strokeOuter: 2.8,
    strokeInner: 2,
    outerSec: 12,
    innerSec: 7.5,
    innerReverse: true,
  },
  {
    main: "#FB923C",
    dim: "#C2410C",
    segments: 3,
    outerR: 42,
    innerR: 31,
    strokeOuter: 3.5,
    strokeInner: 2.4,
    outerSec: 10,
    innerSec: 6.5,
    innerReverse: true,
  },
  {
    main: "#FF3131",
    dim: "#991B1B",
    segments: 4,
    outerR: 42,
    innerR: 32,
    strokeOuter: 3.2,
    strokeInner: 2.2,
    outerSec: 9,
    innerSec: 6,
    innerReverse: false,
    microR: 46,
    microSec: 18,
  },
];

function ringDashArray(r: number, segments: number): string {
  const c = 2 * Math.PI * r;
  const parts = segments * 2;
  const unit = c / parts;
  return `${unit} ${unit}`;
}

export function PartnerLevelHudOrb({ level }: { level: number }) {
  const n = Math.min(5, Math.max(1, level));
  const t = THEMES[n - 1];
  const uid = `hudg-${n}`;
  const outerDash = ringDashArray(t.outerR, t.segments);
  const innerDash = ringDashArray(t.innerR, t.segments);
  const microDash = t.microR != null ? ringDashArray(t.microR, 6) : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
      <div
        className="relative mx-auto aspect-square w-full max-w-[9.5rem] sm:max-w-[10.5rem]"
        role="img"
        aria-label={`Уровень ${n}`}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" aria-hidden>
          <defs>
            <filter id={`${uid}-blur`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={`${uid}-og`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={t.main} />
              <stop offset="100%" stopColor={t.dim} />
            </linearGradient>
          </defs>

          <circle cx="50" cy="50" r="47" fill="#060606" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

          <g transform="translate(50 50)">
            {t.microR != null && microDash != null && (
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 0 0"
                  to="360 0 0"
                  dur={`${t.microSec}s`}
                  repeatCount="indefinite"
                />
                <circle
                  r={t.microR}
                  cx="0"
                  cy="0"
                  fill="none"
                  stroke={t.dim}
                  strokeWidth="1"
                  strokeDasharray={microDash}
                  strokeLinecap="round"
                  opacity={0.4}
                  transform="rotate(-90)"
                />
              </g>
            )}

            <g filter={`url(#${uid}-blur)`}>
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 0 0"
                  to="360 0 0"
                  dur={`${t.outerSec}s`}
                  repeatCount="indefinite"
                />
                <circle
                  r={t.outerR}
                  cx="0"
                  cy="0"
                  fill="none"
                  stroke={`url(#${uid}-og)`}
                  strokeWidth={t.strokeOuter}
                  strokeDasharray={outerDash}
                  strokeLinecap="round"
                  transform="rotate(-90)"
                />
              </g>
            </g>

            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={t.innerReverse ? "360 0 0" : "0 0 0"}
                to={t.innerReverse ? "0 0 0" : "360 0 0"}
                dur={`${t.innerSec}s`}
                repeatCount="indefinite"
              />
              <circle
                r={t.innerR}
                cx="0"
                cy="0"
                fill="none"
                stroke={t.main}
                strokeWidth={t.strokeInner}
                strokeDasharray={innerDash}
                strokeLinecap="round"
                opacity={0.95}
                transform="rotate(22)"
              />
            </g>

            {[0, 120, 240].map((deg) => (
              <rect
                key={deg}
                x="-5"
                y="-45"
                width="10"
                height="20"
                rx="1"
                fill="rgba(0,0,0,0.58)"
                transform={`rotate(${deg})`}
              />
            ))}
          </g>

          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fill={t.main}
            fontSize="27"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            style={{
              paintOrder: "stroke fill",
              stroke: "rgba(0,0,0,0.55)",
              strokeWidth: 2,
              filter: `drop-shadow(0 0 8px ${t.main}66)`,
            }}
          >
            {n}
          </text>
        </svg>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:text-[12px]">
        ур.
      </span>
    </div>
  );
}
