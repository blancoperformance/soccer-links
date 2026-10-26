import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import type { SalesReport } from "@/lib/sales";
import { quiz } from "@/features/public/content";
import { games, shelves, genreChips } from "@/features/public/games";

export interface Totals {
  visits: number;
  engaged: number;
  explored: number;
  to_site: number;
  clicks: number;
  product_clicks: number;
  support_clicks: number;
  quiz_start: number;
  quiz_complete: number;
  quiz_result_click: number;
  searches: number;
  searches_no_result: number;
  assistant_questions: number;
  events: number;
  /** Purchase funnel (all count visits, i.e. one per person). Absent until the funnel SQL is run. */
  product_viewers?: number;
  size_selectors?: number;
  checkout_sessions?: number;
  checkout_events?: number;
  no_size_sessions?: number;
  checkout_with_coupon?: number;
  checkout_from_quiz?: number;
}

export interface DashboardData {
  version: number;
  totals: Totals;
  daily: { day: string; visits: number; clicks: number }[];
  hours: { hour: number; visits: number }[];
  weekdays: { dow: number; visits: number }[];
  devices: { device: string; n: number }[];
  top_links: { item: string; n: number; sessions: number }[];
  products: { key: string; name: string | null; n: number; from_quiz: number }[];
  categories: { item: string; n: number }[];
  searches: { term: string; n: number; no_result: boolean }[];
  quiz_answers: { question: string; answer: string; n: number }[];
  quiz_results: { product: string; n: number }[];
  questions: { question: string; created_at: string }[];
  sources: { source: string; n: number }[];
  campaigns: { campaign: string; n: number }[];
  checkout_products?: { item: string; n: number; sessions: number }[];
  checkout_sizes?: { size: string; n: number }[];
  checkout_by_source?: { source: string; n: number }[];
  no_size_products?: { item: string; n: number }[];
}

export interface Ranked {
  label: string;
  n: number;
  note?: string;
}

/* ---------- friendly names ---------- */

const productBySlug = new Map(games.map((g) => [g.slug, g.name]));
const productByUrl = productBySlug; // na Nuvemshop o endereço do produto é o próprio slug (/produtos/<slug>/)
const collectionBySlug = new Map<string, string>([
  ...shelves.map((s) => [s.id, s.name] as [string, string]),
  ...genreChips.map((c) => [`genero-${c.id}`, `Gênero: ${c.label}`] as [string, string]),
]);

export const QUIZ_QUESTION_LABEL: Record<string, string> = {
  console: "Console",
  "para-quem": "Para quem",
  jeito: "Como joga",
  genero: "Gênero",
  estilo: "Estilo",
  momento: "Lançamento ou clássico",
  licenca: "Licença",
};
const quizOptionLabel = new Map(
  quiz.flatMap((q) => q.options.map((o) => [`${q.id}:${o.id}`, o.label] as const)),
);

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/(^|\s)\S/g, (m) => m.toUpperCase());

export const productName = (slugOrKey: string, fallback?: string | null) => {
  const [kind, value = slugOrKey] = slugOrKey.includes(":")
    ? (slugOrKey.split(":", 2) as [string, string])
    : ["slug", slugOrKey];
  return (
    (kind === "url" ? productByUrl.get(value) : productBySlug.get(value)) ??
    fallback ??
    titleCase(value)
  );
};
export const categoryName = (slug: string) =>
  slug === "quiz" ? "Quiz: jogo ideal" : (collectionBySlug.get(slug) ?? titleCase(slug));
export const quizAnswerLabel = (question: string, answer: string) =>
  quizOptionLabel.get(`${question}:${answer}`) ?? titleCase(answer);

const SOURCE_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  google: "Google",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  direto: "Direto ou sem origem",
};
export const sourceName = (s: string) => SOURCE_LABEL[s] ?? s;
const DEVICE_LABEL: Record<string, string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Computador",
  desconhecido: "Outro",
};
export const deviceName = (d: string) => DEVICE_LABEL[d] ?? d;
export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Product clicks from the grid and from the quiz, merged under one name. */
export function rankedProducts(d: DashboardData): Ranked[] {
  const m = new Map<string, { n: number; quiz: number }>();
  for (const p of d.products) {
    const name = productName(p.key, p.name);
    const cur = m.get(name) ?? { n: 0, quiz: 0 };
    m.set(name, { n: cur.n + p.n, quiz: cur.quiz + p.from_quiz });
  }
  return [...m.entries()]
    .map(([label, v]) => ({
      label,
      n: v.n,
      ...(v.quiz ? { note: `${v.quiz} pelo quiz` } : {}),
    }))
    .sort((a, b) => b.n - a.n);
}

/** True once the funnel SQL ran and the panel receives the purchase numbers. */
export const hasPurchaseFunnel = (d: DashboardData) => d.totals.checkout_sessions !== undefined;

/**
 * The buying journey, one step per row, always counting people (visits), never clicks:
 * visited → opened a product → picked a size → tapped buy (left for the store checkout).
 */
export function purchaseFunnel(d: DashboardData) {
  const t = d.totals;
  return [
    { label: "Visitaram a página", value: t.visits },
    { label: "Abriram um jogo", value: t.product_viewers ?? 0 },
    { label: "Escolheram a licença", value: t.size_selectors ?? 0 },
    { label: "Foram ao carrinho", value: t.checkout_sessions ?? 0 },
  ];
}

/** The same funnel told in everyday words: out of every 100 visitors, and where most people are lost. */
export function funnelStory(d: DashboardData): { headline: string; loss: string | null } | null {
  const steps = purchaseFunnel(d);
  const visits = steps[0]?.value ?? 0;
  if (visits === 0) return null;
  const per100 = (n: number) =>
    (Math.round((n / visits) * 1000) / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const [, opened, size, checkout] = steps.map((s) => s.value);
  const pessoas = (n: number) => `${n.toLocaleString("pt-BR")} ${n === 1 ? "pessoa" : "pessoas"}`;
  const headline =
    visits >= 100
      ? `De cada 100 pessoas que entraram, ${per100(opened ?? 0)} abriram um jogo, ${per100(size ?? 0)} escolheram a licença e ${per100(checkout ?? 0)} tocaram em comprar e foram para o carrinho.`
      : `Neste período entraram ${pessoas(visits)}: ${opened ?? 0} abriram um jogo, ${size ?? 0} escolheram a licença e ${checkout ?? 0} tocaram em comprar e foram para o carrinho.`;
  let worst: { from: string; to: string; rate: number } | null = null;
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1];
    const b = steps[i];
    if (!a || !b || a.value === 0) continue;
    const rate = b.value / a.value;
    if (!worst || rate < worst.rate) worst = { from: a.label, to: b.label, rate };
  }
  const loss = worst
    ? `Onde mais se perde gente: entre "${worst.from}" e "${worst.to}". Só ${Math.round(worst.rate * 100)}% seguiram para a etapa seguinte.`
    : null;
  return { headline, loss };
}

export function quizGroups(d: DashboardData) {
  const g = new Map<string, Ranked[]>();
  for (const r of d.quiz_answers) {
    const list = g.get(r.question) ?? [];
    list.push({ label: quizAnswerLabel(r.question, r.answer), n: r.n });
    g.set(r.question, list);
  }
  const order = quiz.map((q) => q.id);
  return [...g.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}

/* ---------- loading ---------- */

export class DashboardError extends Error {
  constructor(public kind: "forbidden" | "outdated" | "other") {
    super(kind);
  }
}

export async function loadDashboard(from: Date, to: Date): Promise<DashboardData> {
  const { data, error } = await db.rpc("soccer_dashboard", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw new DashboardError(error.code === "42501" ? "forbidden" : "other");
  // jsonb payload: its shape is defined by the SQL function, checked through `version`.
  const d = data as DashboardData | null;
  if (!d || d.version !== 2) throw new DashboardError("outdated");
  return d;
}

export async function resetEvents(): Promise<number> {
  const { data, error } = await db.rpc("soccer_reset_events");
  if (error) throw new DashboardError(error.code === "42501" ? "forbidden" : "other");
  return Number(data) || 0;
}

/* ---------- numbers ---------- */

export const fmt = (n: number) => n.toLocaleString("pt-BR");
export const share = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
export const pctLabel = (a: number, b: number) => (b > 0 ? `${share(a, b)}%` : "–");

/** % change vs. previous period; null when there is nothing to compare. */
export function delta(now: number, before: number | undefined): number | null {
  if (before === undefined || before === 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export function peak<T>(rows: T[], value: (r: T) => number): T | null {
  let best: T | null = null;
  for (const r of rows) if (!best || value(r) > value(best)) best = r;
  return best && value(best) > 0 ? best : null;
}

/* ---------- highlights (plain sentences for the panel and the presentation) ---------- */

export function highlights(d: DashboardData, prev: DashboardData | null): string[] {
  const t = d.totals;
  const out: string[] = [];
  if (t.visits === 0) return out;

  const dv = delta(t.visits, prev?.totals.visits);
  out.push(
    `${fmt(t.visits)} visitas no período${dv === null ? "" : `, ${dv >= 0 ? "+" : ""}${dv}% em relação ao período anterior`}. ${pctLabel(t.engaged, t.visits)} interagiram com a página.`,
  );
  if (t.to_site > 0)
    out.push(`${pctLabel(t.to_site, t.visits)} das visitas seguiram para o site ou para um jogo.`);
  if (hasPurchaseFunnel(d) && (t.checkout_sessions ?? 0) > 0)
    out.push(
      `${fmt(t.checkout_sessions ?? 0)} visitas tocaram em comprar e foram ao carrinho (${pctLabel(t.checkout_sessions ?? 0, t.product_viewers ?? 0)} de quem abriu um jogo).`,
    );

  const prod = rankedProducts(d)[0];
  if (prod) out.push(`Produto mais clicado: ${prod.label} (${fmt(prod.n)} cliques).`);

  const cat = d.categories[0];
  if (cat) out.push(`Categoria com mais interesse: ${categoryName(cat.item)}.`);

  const link = d.top_links[0];
  if (link && t.clicks > 0)
    out.push(
      `Botão mais usado: ${link.item}, com ${pctLabel(link.n, t.clicks)} de todos os cliques.`,
    );

  const h = peak(d.hours, (r) => r.visits);
  const w = peak(d.weekdays, (r) => r.visits);
  if (h && w)
    out.push(
      `Pico de acesso por volta das ${h.hour}h. O dia da semana com mais visitas é ${WEEKDAYS[w.dow]?.toLowerCase()}.`,
    );

  const missing = d.searches.filter((s) => s.no_result).slice(0, 3);
  if (missing.length)
    out.push(
      `Buscaram e não encontraram: ${missing.map((s) => `"${s.term}"`).join(", ")}. Vale revisar o catálogo ou os nomes.`,
    );

  if (t.quiz_start > 0) {
    const first = quizGroups(d).find(([q]) => q === "genero")?.[1][0];
    out.push(
      `${pctLabel(t.quiz_complete, t.quiz_start)} de quem começou o quiz chegou ao resultado${first ? `. A resposta mais comum foi "${first.label}"` : ""}.`,
    );
  }

  const mob = d.devices.find((x) => x.device === "mobile");
  if (mob) out.push(`${pctLabel(mob.n, t.visits)} das visitas vieram do celular.`);
  return out;
}

/* ---------- CSV (opens in Excel / Google Sheets) ---------- */

/** Text typed by visitors could start with = + - @ and run as a formula in Excel. Neutralize it. */
function csvSafe(v: unknown): string {
  const s = String(v ?? "");
  return typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function toCsv(d: DashboardData, periodLabel: string) {
  const rows: (string | number)[][] = [["Seção", "Item", "Valor", "Obs."]];
  const t = d.totals;
  rows.push(["Período", periodLabel, "", ""]);
  (
    [
      ["Visitas", t.visits],
      ["Visitas que interagiram", t.engaged],
      ["Visitas que foram ao site", t.to_site],
      ["Cliques", t.clicks],
      ["Cliques em jogos", t.product_clicks],
      ["Cliques em atendimento", t.support_clicks],
      ["Quiz iniciado", t.quiz_start],
      ["Quiz concluído", t.quiz_complete],
      ["Buscas", t.searches],
      ["Buscas sem resultado", t.searches_no_result],
    ] as const
  ).forEach(([k, v]) => rows.push(["Resumo", k, v, ""]));
  if (hasPurchaseFunnel(d)) {
    const steps = purchaseFunnel(d);
    steps.forEach((s, i) =>
      rows.push([
        "Funil de compra",
        s.label,
        s.value,
        i === 0
          ? ""
          : `${pctLabel(s.value, steps[i - 1]?.value ?? 0)} da etapa anterior · ${pctLabel(s.value, steps[0]?.value ?? 0)} das visitas`,
      ]),
    );
    rows.push([
      "Funil de compra",
      "Tentaram comprar sem escolher a licença",
      t.no_size_sessions ?? 0,
      "",
    ]);
    rows.push([
      "Funil de compra",
      "Foram ao carrinho depois do quiz",
      t.checkout_from_quiz ?? 0,
      "",
    ]);
    (d.checkout_products ?? []).forEach((r) =>
      rows.push(["Carrinho por jogo", productName(r.item), r.sessions, `${r.n} cliques`]),
    );
    (d.checkout_sizes ?? []).forEach((r) => rows.push(["Carrinho por licença", r.size, r.n, ""]));
    (d.checkout_by_source ?? []).forEach((r) =>
      rows.push(["Checkout por origem", sourceName(r.source), r.n, ""]),
    );
    (d.no_size_products ?? []).forEach((r) =>
      rows.push(["Quiseram comprar sem licença", productName(r.item), r.n, ""]),
    );
  }
  d.daily.forEach((r) => rows.push(["Visitas por dia", r.day, r.visits, `${r.clicks} cliques`]));
  d.top_links.forEach((r) => rows.push(["Botões e links", r.item, r.n, ""]));
  rankedProducts(d).forEach((r) => rows.push(["Produtos", r.label, r.n, r.note ?? ""]));
  d.categories.forEach((r) => rows.push(["Categorias", categoryName(r.item), r.n, ""]));
  d.searches.forEach((r) => rows.push(["Buscas", r.term, r.n, r.no_result ? "sem resultado" : ""]));
  quizGroups(d).forEach(([q, list]) =>
    list.forEach((r) => rows.push([`Quiz: ${QUIZ_QUESTION_LABEL[q] ?? q}`, r.label, r.n, ""])),
  );
  d.quiz_results.forEach((r) => rows.push(["Resultado do quiz", productName(r.product), r.n, ""]));
  d.hours.forEach((r) => rows.push(["Horário", `${r.hour}h`, r.visits, ""]));
  d.weekdays.forEach((r) => rows.push(["Dia da semana", WEEKDAYS[r.dow] ?? "", r.visits, ""]));
  d.devices.forEach((r) => rows.push(["Aparelho", deviceName(r.device), r.n, ""]));
  d.sources.forEach((r) => rows.push(["Origem", sourceName(r.source), r.n, ""]));
  d.campaigns.forEach((r) => rows.push(["Campanha", r.campaign, r.n, ""]));
  const esc = (v: string | number) => `"${csvSafe(v).replace(/"/g, '""')}"`;
  // BOM + semicolon so Excel in pt-BR opens it with accents and columns right.
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

/* ---------- Seja Creator ---------- */

export interface CreatorRow {
  id: number;
  created_at: string;
  name: string;
  instagram: string;
  tiktok: string | null;
  whatsapp: string;
  email: string | null;
  city: string;
  followers: string | null;
  niches: string | null;
  rides: string | null;
  content_link: string | null;
  message: string | null;
  status: CreatorStatus;
}
export type CreatorStatus = "novo" | "em-contato" | "aprovado" | "recusado";
export const CREATOR_STATUS: { id: CreatorStatus; label: string }[] = [
  { id: "novo", label: "A avaliar" },
  { id: "em-contato", label: "Em contato" },
  { id: "aprovado", label: "Aprovado" },
  { id: "recusado", label: "Recusado" },
];
export const FOLLOWERS_LABEL: Record<string, string> = {
  "ate-5k": "até 5 mil",
  "5k-20k": "5 a 20 mil",
  "20k-100k": "20 a 100 mil",
  "100k+": "100 mil+",
};

/**
 * Deletes one contact for good (LGPD: when someone asks to be removed, or a test entry).
 * Throws when nothing was deleted, so the panel never shows a row as gone when it is not.
 */
export async function deleteContact(name: "leads" | "creators", id: number) {
  const { data, error } = await db.from(name).delete().eq("id", id).select("id");
  if (error || !Array.isArray(data) || data.length === 0) throw new Error("delete");
}

/** Returns null when the creators table does not exist yet (SQL not run). */
export async function loadCreators(): Promise<CreatorRow[] | null> {
  const { data, error } = await db
    .from("creators")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return null;
  return Array.isArray(data) ? (data as CreatorRow[]) : [];
}

export async function setCreatorStatus(id: number, status: CreatorStatus) {
  const { error } = await db.from("creators").update({ status }).eq("id", id);
  if (error) throw new Error("update");
}

export function creatorsCsv(rows: CreatorRow[]) {
  const head = [
    "Data",
    "Status",
    "Nome",
    "Instagram",
    "TikTok",
    "WhatsApp",
    "E-mail",
    "Cidade",
    "Seguidores",
    "Nichos",
    "Pilota",
    "Conteúdo",
    "Mensagem",
  ];
  const esc = (v: unknown) => `"${csvSafe(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      new Date(r.created_at).toLocaleString("pt-BR"),
      CREATOR_STATUS.find((s) => s.id === r.status)?.label ?? r.status,
      r.name,
      r.instagram,
      r.tiktok,
      r.whatsapp,
      r.email,
      r.city,
      r.followers ? (FOLLOWERS_LABEL[r.followers] ?? r.followers) : "",
      r.niches,
      r.rides === "sim" ? "Sim" : r.rides === "nao" ? "Não" : "",
      r.content_link,
      r.message,
    ]
      .map(esc)
      .join(";"),
  );
  return "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
}

/* ---------- Quiz leads (CRM) ---------- */

export interface LeadRow {
  id: number;
  created_at: string;
  name: string;
  whatsapp: string;
  email: string | null;
  answers: Record<string, string> | null;
  result: string | null;
  source: string | null;
  status: LeadStatus;
  /** Código anônimo da visita (só nos contatos salvos depois do SQL 20261023100000). */
  session_id?: string | null;
}
export type LeadStatus = "novo" | "em-contato" | "cliente" | "descartado";
export const LEAD_STATUS: { id: LeadStatus; label: string }[] = [
  { id: "novo", label: "A contatar" },
  { id: "em-contato", label: "Em contato" },
  { id: "cliente", label: "Comprou" },
  { id: "descartado", label: "Descartado" },
];

/** The contacts could not be read in full (network, permission, or a page failing midway). */
export class LeadsError extends Error {
  constructor(public code: string | undefined) {
    super("leads");
  }
}

// "Table not found": PostgREST schema cache (PGRST205) or Postgres itself (42P01).
const LEADS_TABLE_MISSING = ["PGRST205", "42P01"];

/**
 * Returns null when the table does not exist yet. Reads in pages of 1000 (the API's per-request cap).
 * Any other failure throws LeadsError, so a partial list is never returned as if it were complete.
 * With `since`, only contacts from that moment on are read (filtered in the database).
 */
export async function loadLeads(since?: Date): Promise<LeadRow[] | null> {
  const all: LeadRow[] = [];
  for (let start = 0; start < 50000; start += 1000) {
    const query = db.from("leads").select("*");
    const { data, error } = await (since ? query.gte("created_at", since.toISOString()) : query)
      .order("created_at", { ascending: false })
      .range(start, start + 999);
    if (error) {
      const code = error.code;
      if (start === 0 && code && LEADS_TABLE_MISSING.includes(code)) return null;
      throw new LeadsError(code);
    }
    const page = Array.isArray(data) ? (data as LeadRow[]) : [];
    all.push(...page);
    if (page.length < 1000) break;
  }
  return all;
}

export async function setLeadStatus(id: number, status: LeadStatus) {
  const { error } = await db.from("leads").update({ status }).eq("id", id);
  if (error) throw new Error("update");
}

export function leadsCsv(rows: LeadRow[]) {
  const qs = [...new Set(rows.flatMap((r) => Object.keys(r.answers ?? {})))];
  const head = [
    "Data",
    "Status",
    "Nome",
    "WhatsApp",
    "Indicado pelo quiz",
    ...qs.map((q) => QUIZ_QUESTION_LABEL[q] ?? q),
    "Origem",
  ];
  const esc = (v: unknown) => `"${csvSafe(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      new Date(r.created_at).toLocaleString("pt-BR"),
      LEAD_STATUS.find((s) => s.id === r.status)?.label ?? r.status,
      r.name,
      r.whatsapp,
      r.result ? productName(r.result) : "",
      ...qs.map((q) => r.answers?.[q] ?? ""),
      r.source ?? "",
    ]
      .map(esc)
      .join(";"),
  );
  return "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
}

/**
 * Phone as WhatsApp dispatch tools expect it: digits only, country code first (5511999998888).
 * The quiz form stores DDD + number (10-11 digits) and sometimes already the 55.
 * Returns null when it cannot be a Brazilian number.
 */
export function dispatchPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  const full = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d : `55${d}`;
  return full.length === 12 || full.length === 13 ? full : null;
}

/**
 * CSV for uploading the quiz contacts to a dispatch platform (comma-separated, UTF-8).
 * One row per phone (most recent answer wins); contacts without a valid number are skipped.
 * Everyone in `leads` has already given consent (the form requires it).
 */
export function leadsDispatchCsv(rows: LeadRow[]) {
  const qs = [...new Set(rows.flatMap((r) => Object.keys(r.answers ?? {})))];
  const head = [
    "nome",
    "primeiro_nome",
    "telefone",
    "email",
    "produto_indicado",
    ...qs.map((q) => `quiz_${q.replace(/-/g, "_")}`),
    "origem",
    "data_cadastro",
    "consentimento_lgpd",
  ];
  const esc = (v: unknown) => `"${csvSafe(v).replace(/"/g, '""')}"`;
  const seen = new Set<string>();
  let skipped = 0;
  const lines: string[] = [];
  // `rows` arrive newest first, so the first time a phone shows up is its latest entry.
  for (const r of rows) {
    const phone = dispatchPhone(r.whatsapp);
    if (!phone) {
      skipped += 1;
      continue;
    }
    if (seen.has(phone)) continue;
    seen.add(phone);
    lines.push(
      [
        r.name,
        r.name.trim().split(/\s+/)[0] ?? "",
        phone,
        r.email ?? "",
        r.result ? productName(r.result) : "",
        ...qs.map((q) => r.answers?.[q] ?? ""),
        r.source ?? "",
        new Date(r.created_at).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }),
        "sim",
      ]
        .map(esc)
        .join(","),
    );
  }
  return { csv: [head.map(esc).join(","), ...lines].join("\r\n"), count: lines.length, skipped };
}

/* ---------- vendas da loja (via /api/vendas, no servidor) ---------- */

export type SalesError = "scope" | "invalid" | "token" | "api" | "auth";

/** Pedidos pagos da Nuvemshop que vieram do links. O token da loja nunca passa pelo navegador. */
export async function loadSalesReport(from: Date, to: Date): Promise<SalesReport> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new Error("auth");
  const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  const r = await fetch(`/api/vendas?${q.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (r.status === 401) throw new Error("auth");
  const body = (await r.json()) as SalesReport & { error?: string };
  if (body.error)
    throw new Error(["scope", "invalid", "token"].includes(body.error) ? body.error : "api");
  return body;
}

/* ---------- foi para a compra e não comprou ---------- */

export interface Recovery {
  lead: LeadRow;
  /** Jogo e licença que a pessoa mandou para o carrinho. */
  product: string;
  license: string | null;
  /** Quando tocou em Comprar. */
  at: string;
}

/** Espera isso depois do clique antes de listar (a pessoa pode estar pagando). */
const RECOVERY_WAIT_MS = 30 * 60000;
/** Só vale chamar quem mostrou interesse há pouco tempo. */
const RECOVERY_DAYS = 30;

/**
 * Contatos ainda "A contatar" cuja visita tocou em Comprar e não teve pedido pago na loja.
 * O cruzamento é pelo código anônimo da visita: só cobre contatos salvos depois do SQL que criou
 * leads.session_id, e a compra precisa ter começado por um link daquela mesma visita.
 */
export async function loadRecovery(leads: LeadRow[], now = Date.now()): Promise<Recovery[]> {
  const since = now - RECOVERY_DAYS * 86400000;
  const pending = leads.filter(
    (l) => l.session_id && l.status === "novo" && Date.parse(l.created_at) >= since,
  );
  if (!pending.length) return [];
  const ids = [...new Set(pending.map((l) => l.session_id as string))];
  const clicks = new Map<
    string,
    { item: string | null; detail: string | null; created_at: string }
  >();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const ev = await db
      .from("events")
      .select("session_id,item,detail,created_at")
      .eq("event", "checkout_click")
      .in("session_id", chunk)
      .order("created_at", { ascending: false });
    if (ev.error) throw new Error("events");
    for (const e of (ev.data ?? []) as {
      session_id: string;
      item: string | null;
      detail: string | null;
      created_at: string;
    }[])
      if (!clicks.has(e.session_id)) clicks.set(e.session_id, e);
  }
  // Sem permissão de pedidos na Nuvemshop ainda, não dá para saber quem pagou: a lista não aparece.
  const report = await loadSalesReport(new Date(since), new Date(now));
  const bought = new Set(report.sales.map((s) => s.sid).filter(Boolean) as string[]);
  const out: Recovery[] = [];
  for (const lead of pending) {
    const sid = lead.session_id as string;
    const c = clicks.get(sid);
    if (!c || bought.has(sid) || now - Date.parse(c.created_at) < RECOVERY_WAIT_MS) continue;
    const lic = (c.detail ?? "").trim();
    out.push({
      lead,
      product: c.item ? productName(c.item.split(",")[0] ?? c.item) : "",
      license: lic && !/sem licen|sacola/i.test(lic) ? lic : null,
      at: c.created_at,
    });
  }
  // Uma linha por pessoa (o mesmo número em mais de um contato fica com o clique mais recente).
  const byPhone = new Map<string, Recovery>();
  for (const r of out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))) {
    const k = r.lead.whatsapp.replace(/\D/g, "");
    if (!byPhone.has(k)) byPhone.set(k, r);
  }
  return [...byPhone.values()];
}

/** O que foi para a loja: "EA Sports FC 26 para PS5, licença primária". */
export function recoveryPaste(r: Recovery): string {
  return [r.product, r.license && `licença ${r.license.toLowerCase()}`].filter(Boolean).join(", ");
}

export function recoveryMessage(r: Recovery): string {
  const first = r.lead.name.trim().split(/\s+/)[0] ?? "";
  const what = recoveryPaste(r);
  return `Oi, ${first}! Aqui é da Soccer Games. Vi que você chegou a escolher ${what ? `o ${what}` : "um jogo"} e não finalizou. Ficou alguma dúvida sobre a licença ou a ativação? Te ajudo por aqui.`;
}

/* ---------- checagem do sistema (Ajustes) ---------- */

export type CheckState = "ok" | "warn" | "bad";
export interface SystemCheck {
  id: string;
  state: CheckState;
  detail: string;
  /** O que fazer quando não está ok. */
  fix?: string;
  at?: string | null;
}

const lastRow = async (table: "events" | "leads" | "black_vip_leads") => {
  const { data, error } = await db
    .from(table)
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (
    ((data as unknown as { created_at: string }[] | null)?.[0]?.created_at as string | undefined) ??
    null
  );
};

/** Testes de verdade, um por peça do sistema. Nada aqui é estimado. */
export async function loadSystemChecks(now = Date.now()): Promise<Record<string, SystemCheck>> {
  const hrs = (iso: string) => (now - Date.parse(iso)) / 3600e3;
  const out: Record<string, SystemCheck> = {};
  const run = async (id: string, fn: () => Promise<Omit<SystemCheck, "id">>) => {
    try {
      out[id] = { id, ...(await fn()) };
    } catch {
      out[id] = {
        id,
        state: "bad",
        detail: "Não consegui testar agora.",
        fix: "Atualize a página. Se continuar, confira o Supabase.",
      };
    }
  };
  await Promise.all([
    run("visitas", async () => {
      const at = await lastRow("events");
      if (!at)
        return {
          state: "warn",
          detail: "Nenhuma visita registrada ainda.",
          fix: "Abra o links pelo celular (fora da equipe) e veja se aparece aqui.",
        };
      return hrs(at) > 24
        ? {
            state: "warn",
            at,
            detail: "Última visita registrada faz mais de 24 horas.",
            fix: "Confira se o links está no ar e se a bio aponta para links.lojasoccergames.com.br.",
          }
        : { state: "ok", at, detail: "Visitas chegando normalmente." };
    }),
    run("quiz", async () => {
      const { error } = await db.from("leads").select("session_id").limit(1);
      if (error?.code === "42703")
        return {
          state: "warn",
          detail:
            'Os contatos do quiz ainda não guardam o código da visita, então a lista "foi para a compra e não comprou" fica vazia.',
          fix: "Rodar no Supabase (SQL Editor) o arquivo supabase/migrations/20261023100000_soccer_links_leads_session.sql.",
        };
      if (error) throw error;
      const at = await lastRow("leads");
      return {
        state: "ok",
        at,
        detail: at
          ? "Contatos do quiz salvando com o código da visita."
          : "Tabela pronta. Ainda sem contatos.",
      };
    }),
    run("catalogo", async () => {
      const r = await fetch("/api/loja?status=1");
      const b = (await r.json()) as {
        mode?: string;
        configured?: boolean;
        count?: number;
        error?: string;
      };
      if (b.mode === "api")
        return {
          state: "ok",
          detail: `Preços e estoque lidos direto da loja (${fmt(b.count ?? 0)} produtos).`,
        };
      if (b.configured === false)
        return {
          state: "warn",
          detail: "Sem chave da Nuvemshop: preços vêm da página de cada jogo, mais devagar.",
          fix: "Na Vercel, cadastrar NUVEMSHOP_STORE_ID e NUVEMSHOP_TOKEN (Settings > Environment Variables) e fazer Redeploy.",
        };
      return {
        state: "bad",
        detail: "A chave da Nuvemshop está cadastrada, mas a loja recusou.",
        fix: "Gerar um token novo no app da Nuvemshop e trocar NUVEMSHOP_TOKEN na Vercel.",
      };
    }),
    run("vendas", async () => {
      try {
        const rep = await loadSalesReport(new Date(now - 7 * 86400e3), new Date(now));
        return {
          state: "ok",
          detail: `Pedidos pagos sendo lidos da loja (últimos 7 dias: ${fmt(rep.sales.length)} do links de ${fmt(rep.storeOrders)} na loja).`,
        };
      } catch (e) {
        const k = e instanceof Error ? e.message : "";
        if (k === "scope")
          return {
            state: "bad",
            detail:
              "O app da Nuvemshop não tem permissão para ler pedidos. A aba Vendas fica sem dados.",
            fix: 'No app da Nuvemshop, marcar "Pedidos: ler", reinstalar, e trocar NUVEMSHOP_TOKEN na Vercel pelo token novo.',
          };
        if (k === "invalid")
          return {
            state: "bad",
            detail: "A Nuvemshop recusou o token: ele não vale ou é de outra loja.",
            fix: 'Colar na Vercel o NUVEMSHOP_TOKEN e o NUVEMSHOP_STORE_ID da página "Pronto" e fazer Redeploy.',
          };
        if (k === "token")
          return {
            state: "warn",
            detail: "Sem token da Nuvemshop na Vercel, então não dá para ler as vendas.",
            fix: "Cadastrar NUVEMSHOP_TOKEN na Vercel e fazer Redeploy.",
          };
        throw e;
      }
    }),
    run("plano", async () => {
      const r = await (
        db as unknown as {
          rpc: (f: string) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
        }
      ).rpc("black_papel");
      if (r.error && ["PGRST202", "42883"].includes(r.error.code ?? ""))
        return {
          state: "warn",
          detail:
            "O plano da Black (calendário, quadro do time e acessos) ainda não está ativo no banco.",
          fix: "Rodar no Supabase (SQL Editor) o arquivo supabase/migrations/20261026100000_soccer_black_plano.sql.",
        };
      if (r.error) throw r.error;
      return {
        state: "ok",
        detail: r.data
          ? `Plano da Black ativo. Seu acesso: ${r.data === "editor" ? "edita" : "só vê"}.`
          : "Plano da Black ativo. Este e-mail não está na equipe da Black.",
      };
    }),
    run("black", async () => {
      const at = await lastRow("black_vip_leads");
      return {
        state: "ok",
        at,
        detail: at ? "Cadastros da Black chegando." : "Tabela pronta. Ainda sem cadastros.",
      };
    }),
  ]);
  return out;
}
