import { useId, useRef, useState } from "react";
import { fmt, type Ranked } from "./data";

export const C = {
  ink: "#0f0f0f",
  muted: "#6b6b6b",
  faint: "#a8a49d",
  line: "#e7e4df",
  track: "#f1efeb",
  accent: "#8a00c2",
  accentSoft: "rgba(138, 0, 194,0.10)",
  prev: "#bdb8b0",
};

export function Empty({ children = "Sem dados no período." }: { children?: React.ReactNode }) {
  return <p className="py-4 text-sm text-neutral-400">{children}</p>;
}

export function Delta({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  if (value === null) return null;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span
      className={`whitespace-nowrap px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${flat ? "bg-neutral-100 text-neutral-500" : up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
      title="Comparado ao período anterior"
    >
      {flat ? "=" : up ? "↑" : "↓"} {Math.abs(value)}%{suffix}
    </span>
  );
}

export function Kpi({
  label,
  value,
  sub,
  delta,
  spark,
  accent,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  delta?: number | null | undefined;
  /** Daily values for the small trend line under the number. */
  spark?: number[] | undefined;
  /** Orange top rule: the number this page exists for. */
  accent?: boolean;
  /** Kept for older callers (presentation). */
  big?: boolean;
}) {
  return (
    <div className="relative flex min-h-[148px] flex-col bg-white p-5">
      {accent && (
        <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: C.accent }} />
      )}
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-3">
        <p className="text-[32px] font-semibold leading-none tabular-nums tracking-tight text-neutral-950">
          {value}
        </p>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      {sub && <p className="mt-2 text-xs leading-snug text-neutral-500">{sub}</p>}
      {spark && spark.length > 1 && spark.some(Boolean) && (
        <div className="mt-auto pt-3">
          <Spark values={spark} />
        </div>
      )}
    </div>
  );
}

/** Tiny trend line, no axes. */
export function Spark({ values, height = 28 }: { values: number[]; height?: number }) {
  const W = 200;
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => `${(i / (n - 1)) * W},${height - 2 - (v / max) * (height - 4)}`);
  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      className="block h-7 w-full"
      aria-hidden
    >
      <polyline
        points={`0,${height} ${pts.join(" ")} ${W},${height}`}
        fill={C.accentSoft}
        stroke="none"
      />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={C.accent}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * The buying journey as a row of steps: big number, share of visitors, and how many
 * moved on to the next step. The weakest passage is marked, that is where to act.
 */
export function Journey({ steps }: { steps: { label: string; value: number; hint?: string }[] }) {
  const first = steps[0]?.value ?? 0;
  if (first === 0) return <Empty>Sem visitas no período.</Empty>;
  let worst = -1;
  let worstRate = 2;
  steps.forEach((s, i) => {
    const prev = steps[i - 1]?.value ?? 0;
    if (i > 0 && prev > 0 && s.value / prev < worstRate) {
      worstRate = s.value / prev;
      worst = i;
    }
  });
  return (
    <ol className="grid gap-px overflow-hidden border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => {
        const prev = steps[i - 1]?.value ?? 0;
        const rate = i > 0 && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        const last = i === steps.length - 1;
        return (
          <li key={s.label} className="relative bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                Etapa {i + 1}
              </span>
              {rate !== null && (
                <span
                  className={`px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${i === worst ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-600"}`}
                  title="Quantos seguiram da etapa anterior para esta"
                >
                  {rate}% seguiram
                </span>
              )}
            </div>
            <p className="mt-3 text-sm font-medium text-neutral-800">{s.label}</p>
            <p
              className="mt-1 text-[34px] font-semibold leading-none tabular-nums tracking-tight"
              style={{ color: last ? C.accent : C.ink }}
            >
              {fmt(s.value)}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              {i === 0
                ? "100% das visitas"
                : `${Math.round((s.value / first) * 1000) / 10}% das visitas`}
            </p>
            <div className="mt-3 h-1" style={{ background: C.track }}>
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(1, (s.value / first) * 100)}%`,
                  background: last ? C.accent : C.ink,
                }}
              />
            </div>
            {s.hint && <p className="mt-2 text-[11px] leading-snug text-neutral-400">{s.hint}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/** Ranked list with a thin bar under each row. Values are always printed, so color is never the only cue. */
export function BarList({
  rows,
  max = 8,
  total,
  accent,
}: {
  rows: Ranked[];
  max?: number;
  total?: number;
  accent?: boolean;
}) {
  if (rows.length === 0) return <Empty />;
  const shown = rows.slice(0, max);
  const top = Math.max(1, ...shown.map((r) => r.n));
  return (
    <ul className="space-y-3">
      {shown.map((r, i) => (
        <li key={`${r.label}-${i}`} className="group">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 truncate text-neutral-800">
              {r.label}
              {r.note && <span className="ml-2 text-xs text-neutral-400">{r.note}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-neutral-900">
              {fmt(r.n)}
              {total ? (
                <span className="ml-2 inline-block w-9 text-right text-xs text-neutral-400">
                  {Math.round((r.n / total) * 100)}%
                </span>
              ) : null}
            </span>
          </div>
          <div className="mt-1.5 h-1.5" style={{ background: C.track }}>
            <div
              className="h-full transition-[width] duration-500"
              style={{
                width: `${Math.max(2, (r.n / top) * 100)}%`,
                background: accent && i === 0 ? C.accent : C.ink,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Daily visits: area + line, previous period as a dashed gray line, crosshair tooltip on hover. */
export function TrendChart({
  points,
  prev,
  height = 220,
  hover = true,
}: {
  points: { label: string; value: number; sub?: string }[];
  prev?: number[];
  height?: number;
  hover?: boolean;
}) {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [hi, setHi] = useState<number | null>(null);
  if (points.length === 0 || (points.every((p) => p.value === 0) && !prev?.some(Boolean)))
    return <Empty />;

  const W = 800;
  const H = height;
  const padL = 36;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const maxV = Math.max(1, ...points.map((p) => p.value), ...(prev ?? []));
  const nice = niceMax(maxV);
  const n = points.length;
  const x = (i: number) =>
    padL + (n === 1 ? (W - padL - padR) / 2 : (i / (n - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - v / nice) * (H - padT - padB);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const line = path(points.map((p) => p.value));
  const area = `${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, nice / 2, nice];
  const labelIdx = n <= 8 ? points.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - padL) / (W - padL - padR)) * (n - 1));
    setHi(Math.min(n - 1, Math.max(0, i)));
  };
  const p = hi !== null ? points[hi] : null;

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none select-none"
        onPointerMove={hover ? onMove : undefined}
        onPointerLeave={() => setHi(null)}
        role="img"
        aria-label="Visitas por dia"
      >
        <defs>
          <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={C.accent} stopOpacity="0.16" />
            <stop offset="1" stopColor={C.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={C.faint}>
              {fmt(Math.round(t))}
            </text>
          </g>
        ))}
        {prev && prev.length > 1 && (
          <path
            d={path(prev.slice(0, n))}
            fill="none"
            stroke={C.prev}
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}
        <path d={area} fill={`url(#${id}-g)`} />
        <path d={line} fill="none" stroke={C.accent} strokeWidth="2.25" strokeLinejoin="round" />
        {n <= 31 &&
          points.map((pt, i) =>
            pt.value > 0 ? (
              <circle key={i} cx={x(i)} cy={y(pt.value)} r="2.5" fill={C.accent} />
            ) : null,
          )}
        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 6}
            textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"}
            fontSize="11"
            fill={C.faint}
          >
            {points[i]?.label}
          </text>
        ))}
        {p && hi !== null && (
          <g>
            <line
              x1={x(hi)}
              x2={x(hi)}
              y1={padT}
              y2={H - padB}
              stroke={C.ink}
              strokeWidth="1"
              opacity="0.25"
            />
            <circle
              cx={x(hi)}
              cy={y(p.value)}
              r="5"
              fill={C.accent}
              stroke="#fff"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
      {p && hi !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap bg-neutral-900 px-3 py-2 text-xs text-white shadow"
          style={{ left: `${(x(hi) / W) * 100}%` }}
        >
          <p className="font-medium">{p.label}</p>
          <p className="mt-0.5 tabular-nums">
            {fmt(p.value)} visitas{p.sub ? ` · ${p.sub}` : ""}
          </p>
          {prev?.[hi] !== undefined && (
            <p className="mt-0.5 tabular-nums text-neutral-400">
              período anterior: {fmt(prev[hi] ?? 0)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Vertical columns for a small fixed axis (hours of the day, weekdays). The peak is labeled. */
export function Columns({
  data,
  height = 140,
}: {
  data: { label: string; value: number; title: string }[];
  height?: number;
}) {
  const [hi, setHi] = useState<number | null>(null);
  if (data.every((d) => d.value === 0)) return <Empty />;
  const max = Math.max(1, ...data.map((d) => d.value));
  const peakIdx = data.findIndex((d) => d.value === max);
  const every = data.length > 12 ? 3 : 1;
  return (
    <div>
      <div className="relative flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={d.label}
            className="relative flex h-full flex-1 items-end"
            onPointerEnter={() => setHi(i)}
            onPointerLeave={() => setHi(null)}
          >
            {(i === peakIdx || i === hi) && d.value > 0 && (
              <span className="absolute -top-0.5 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap text-[11px] font-medium tabular-nums text-neutral-900">
                {i === hi ? d.title : fmt(d.value)}
              </span>
            )}
            <div
              className="w-full transition-[height] duration-500"
              style={{
                height: `${Math.max(d.value > 0 ? 3 : 1, (d.value / max) * (height - 18))}px`,
                background: d.value === 0 ? C.track : i === peakIdx ? C.accent : C.ink,
                opacity: hi !== null && hi !== i ? 0.55 : 1,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px]">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 text-center text-[10px] text-neutral-400">
            {i % every === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Funnel: each step as a share of the first. `stepRate` also shows each step vs. the previous one. */
export function Funnel({
  steps,
  stepRate = false,
}: {
  steps: { label: string; value: number }[];
  stepRate?: boolean;
}) {
  const first = steps[0]?.value ?? 0;
  if (first === 0) return <Empty />;
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const w = (s.value / first) * 100;
        const prev = steps[i - 1]?.value ?? 0;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-neutral-800">
                <span className="mr-2 text-xs tabular-nums text-neutral-400">{i + 1}</span>
                {s.label}
              </span>
              <span className="tabular-nums text-neutral-900">
                {fmt(s.value)}
                <span className="ml-2 inline-block w-10 text-right text-xs text-neutral-400">
                  {Math.round(w)}%
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-2" style={{ background: C.track }}>
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(1, w)}%`,
                  background: i === steps.length - 1 ? C.accent : C.ink,
                }}
              />
            </div>
            {stepRate && i > 0 && (
              <p className="mt-1 text-xs tabular-nums text-neutral-500">
                {prev > 0 ? `${Math.round((s.value / prev) * 100)}%` : "–"} de quem estava na etapa
                anterior
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Rounded-up axis maximum (1, 2, 5 × 10^n). */
function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
