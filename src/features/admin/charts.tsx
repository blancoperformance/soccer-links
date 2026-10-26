import { useId, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { fmt, type Ranked } from "./data";

/** Cores do tema do painel (variáveis CSS: seguem claro e escuro). */
export const C = {
  ink: "var(--sg-ink)",
  muted: "var(--sg-muted)",
  faint: "var(--sg-faint)",
  line: "var(--sg-line)",
  track: "var(--sg-surface-2)",
  accent: "var(--sg-brand)",
  accentText: "var(--sg-brand-text)",
  accentSoft: "var(--sg-brand-soft)",
  prev: "var(--sg-faint)",
  neon: "var(--sg-neon)",
};

export function Empty({ children = "Sem dados no período." }: { children?: React.ReactNode }) {
  return <p className="sg-empty">{children}</p>;
}

export function Delta({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  if (value === null) return null;
  const up = value > 0;
  const flat = value === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`sg-chip sg-delta ${flat ? "" : up ? "sg-chip--ok" : "sg-chip--bad"}`}
      title="Comparado ao período anterior"
    >
      <Icon aria-hidden />
      {Math.abs(value)}%{suffix}
      <span className="sg-sr">
        {flat ? "igual" : up ? "a mais" : "a menos"} que o período anterior
      </span>
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
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  delta?: number | null | undefined;
  /** Valores diários para a linha pequena embaixo do número. */
  spark?: number[] | undefined;
  /** O número principal da tela (ícone e número em violeta). */
  accent?: boolean;
  icon?: LucideIcon;
  /** Leva para a tela com o detalhe. */
  onClick?: () => void;
  /** Mantido para chamadas antigas (apresentação). */
  big?: boolean;
}) {
  const inner = (
    <>
      <span className="sg-kpi__head">
        {Icon && (
          <span className="sg-kpi__icon" aria-hidden>
            <Icon />
          </span>
        )}
        <span className="sg-kpi__label">{label}</span>
        {onClick && <ArrowUpRight className="sg-kpi__go" aria-hidden />}
      </span>
      <span className="sg-kpi__row">
        <span className="sg-kpi__value">{value}</span>
        {delta !== undefined && <Delta value={delta} />}
      </span>
      {spark && spark.length > 1 && spark.some(Boolean) ? (
        <span className="sg-kpi__spark">
          <Spark values={spark} />
          {sub && (
            <span className="sg-kpi__foot" style={{ display: "block", marginTop: 6 }}>
              {sub}
            </span>
          )}
        </span>
      ) : (
        sub && <span className="sg-kpi__foot">{sub}</span>
      )}
    </>
  );
  const cls = `sg-kpi ${accent ? "sg-kpi--accent" : ""}`;
  return onClick ? (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** Linha pequena de tendência, sem eixos. */
export function Spark({ values, height = 30 }: { values: number[]; height?: number }) {
  const id = useId();
  const W = 200;
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => `${(i / (n - 1)) * W},${height - 2 - (v / max) * (height - 5)}`);
  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-s`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: C.accent, stopOpacity: 0.22 }} />
          <stop offset="1" style={{ stopColor: C.accent, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${height} ${pts.join(" ")} ${W},${height}`}
        style={{ fill: `url(#${id}-s)`, stroke: "none" }}
      />
      <polyline
        points={pts.join(" ")}
        style={{ fill: "none", stroke: C.accent, strokeWidth: 1.6 }}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * A jornada de compra em etapas: número grande, parte das visitas e quantos seguiram da etapa
 * anterior. A passagem mais fraca fica marcada: é ali que vale agir.
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
    <ol className="sg-journey">
      {steps.map((s, i) => {
        const prev = steps[i - 1]?.value ?? 0;
        const rate = i > 0 && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        const last = i === steps.length - 1;
        const share = (s.value / first) * 100;
        return (
          <li key={s.label} className={`sg-step ${last ? "sg-step--last" : ""}`}>
            <div className="sg-step__top">
              <span className="sg-step__n">etapa {i + 1}</span>
              {rate !== null && (
                <span
                  className={`sg-chip ${i === worst ? "sg-chip--bad" : ""}`}
                  title="Quantos seguiram da etapa anterior para esta"
                >
                  {rate}% seguiram
                </span>
              )}
            </div>
            <span className="sg-step__label">{s.label}</span>
            <span className="sg-step__value">{fmt(s.value)}</span>
            <span className="sg-step__share">
              {i === 0
                ? "100% das visitas"
                : `${(Math.round(share * 10) / 10).toLocaleString("pt-BR")}% das visitas`}
            </span>
            <div className="sg-track sg-track--thin">
              <div
                className={`sg-track__fill ${last ? "sg-track__fill--brand" : ""}`}
                style={{ width: `${Math.max(1.5, share)}%` }}
              />
            </div>
            {s.hint && <span className="sg-step__share">{s.hint}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Ranking com trilho pontilhado. O valor está sempre escrito: a cor nunca é a única pista. */
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
    <ul className="sg-bars">
      {shown.map((r, i) => (
        <li key={`${r.label}-${i}`}>
          <div className="sg-bars__top">
            <span className="sg-bars__name" title={r.label}>
              {r.label}
              {r.note && <span className="sg-bars__note">{r.note}</span>}
            </span>
            <span className="sg-bars__val">
              {fmt(r.n)}
              {total ? (
                <span className="sg-bars__pct">{Math.round((r.n / total) * 100)}%</span>
              ) : null}
            </span>
          </div>
          <div className="sg-track">
            <div
              className={`sg-track__fill ${accent && i === 0 ? "sg-track__fill--brand" : ""}`}
              style={{ width: `${Math.max(2, (r.n / top) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Visitas por dia: área + linha; período anterior tracejado; mira com valores ao passar o dedo/mouse. */
export function TrendChart({
  points,
  prev,
  height = 230,
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
  const padL = 40;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const maxV = Math.max(1, ...points.map((p) => p.value), ...(prev ?? []));
  const nice = niceMax(maxV);
  const n = points.length;
  const x = (i: number) =>
    padL + (n === 1 ? (W - padL - padR) / 2 : (i / (n - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - v / nice) * (H - padT - padB);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const line = path(points.map((p) => p.value));
  const area = `${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, nice / 4, nice / 2, (nice * 3) / 4, nice];
  const labelIdx =
    n <= 8
      ? points.map((_, i) => i)
      : [0, Math.floor((n - 1) / 3), Math.floor(((n - 1) * 2) / 3), n - 1];

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - padL) / (W - padL - padR)) * (n - 1));
    setHi(Math.min(n - 1, Math.max(0, i)));
  };
  const p = hi !== null ? points[hi] : null;
  const axis = { fontFamily: "var(--sg-mono)", fontSize: 11, fill: C.muted } as const;

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          touchAction: "pan-y",
          userSelect: "none",
        }}
        onPointerMove={hover ? onMove : undefined}
        onPointerLeave={() => setHi(null)}
        role="img"
        aria-label={`Visitas por dia: de ${fmt(Math.min(...points.map((q) => q.value)))} a ${fmt(Math.max(...points.map((q) => q.value)))} por dia`}
      >
        <defs>
          <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" style={{ stopColor: C.accent, stopOpacity: 0.2 }} />
            <stop offset="1" style={{ stopColor: C.accent, stopOpacity: 0 }} />
          </linearGradient>
          <pattern id={`${id}-d`} width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" style={{ fill: C.line }} />
          </pattern>
        </defs>
        <rect
          x={padL}
          y={padT}
          width={W - padL - padR}
          height={H - padT - padB}
          fill={`url(#${id}-d)`}
        />
        {ticks.map((t, i) => (
          <g key={t}>
            {(i === 0 || i === 2 || i === 4) && (
              <>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={y(t)}
                  y2={y(t)}
                  style={{ stroke: C.line, strokeWidth: 1 }}
                />
                <text x={padL - 10} y={y(t) + 4} textAnchor="end" style={axis}>
                  {fmt(Math.round(t))}
                </text>
              </>
            )}
          </g>
        ))}
        {prev && prev.length > 1 && (
          <path
            d={path(prev.slice(0, n))}
            style={{ fill: "none", stroke: C.prev, strokeWidth: 1.5, strokeDasharray: "4 5" }}
          />
        )}
        <path d={area} style={{ fill: `url(#${id}-g)` }} />
        <path
          d={line}
          style={{
            fill: "none",
            stroke: C.accent,
            strokeWidth: 2.4,
            strokeLinejoin: "round",
            strokeLinecap: "round",
          }}
        />
        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"}
            style={axis}
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
              style={{ stroke: C.ink, strokeWidth: 1, opacity: 0.22 }}
            />
            <circle
              cx={x(hi)}
              cy={y(p.value)}
              r="5.5"
              style={{ fill: C.accent, stroke: "var(--sg-surface)", strokeWidth: 2.5 }}
            />
          </g>
        )}
      </svg>
      {p && hi !== null && (
        <div
          className="sg-tip"
          style={{ left: `${Math.min(88, Math.max(12, (x(hi) / W) * 100))}%` }}
        >
          <p style={{ fontWeight: 600 }}>{p.label}</p>
          <p className="sg-mono">
            {fmt(p.value)} visitas{p.sub ? ` · ${p.sub}` : ""}
          </p>
          {prev?.[hi] !== undefined && <p className="sg-mono">antes: {fmt(prev[hi] ?? 0)}</p>}
        </div>
      )}
    </div>
  );
}

/** Colunas para um eixo curto e fixo (horas do dia, dias da semana). O pico fica marcado. */
export function Columns({
  data,
  height = 150,
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
      <div
        className="sg-cols"
        style={{ height, paddingTop: 22 }}
        role="img"
        aria-label={data.map((d) => `${d.label}: ${fmt(d.value)}`).join("; ")}
      >
        {data.map((d, i) => (
          <div
            key={d.label}
            className={`sg-cols__col ${i === peakIdx ? "sg-cols__col--peak" : ""}`}
            onPointerEnter={() => setHi(i)}
            onPointerLeave={() => setHi(null)}
          >
            {(i === hi || (hi === null && i === peakIdx)) && d.value > 0 && (
              <span className="sg-cols__tip">{i === hi ? d.title : fmt(d.value)}</span>
            )}
            <div
              className="sg-cols__bar"
              style={{
                height: `${Math.max(d.value > 0 ? 4 : 0, (d.value / max) * 100)}%`,
                opacity: hi !== null && hi !== i ? 0.5 : 1,
              }}
            />
          </div>
        ))}
      </div>
      <div className="sg-cols__axis" aria-hidden>
        {data.map((d, i) => (
          <span key={d.label}>{i % every === 0 ? d.label : ""}</span>
        ))}
      </div>
    </div>
  );
}

/** Funil: cada etapa como parte da primeira. `stepRate` também mostra cada etapa sobre a anterior. */
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
    <ol className="sg-bars" style={{ gap: 16 }}>
      {steps.map((s, i) => {
        const w = (s.value / first) * 100;
        const prev = steps[i - 1]?.value ?? 0;
        return (
          <li key={s.label}>
            <div className="sg-bars__top">
              <span className="sg-bars__name">
                <span
                  className="sg-mono"
                  style={{ marginRight: 10, color: "var(--sg-muted)", fontSize: 12 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.label}
              </span>
              <span className="sg-bars__val">
                {fmt(s.value)}
                <span className="sg-bars__pct">{Math.round(w)}%</span>
              </span>
            </div>
            <div className="sg-track" style={{ height: 10 }}>
              <div
                className={`sg-track__fill ${i === steps.length - 1 ? "sg-track__fill--brand" : ""}`}
                style={{ width: `${Math.max(1.5, w)}%` }}
              />
            </div>
            {stepRate && i > 0 && (
              <p className="sg-bars__note" style={{ margin: "6px 0 0" }}>
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

/** Máximo do eixo arredondado para cima (1, 2, 5 × 10^n). */
function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 4, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
