import { supabase } from "@/integrations/supabase/client";

/** One sign-up of the Black 2026 VIP group (table public.black_vip_leads). */
export interface BlackLead {
  id: number | string;
  created_at: string;
  nome: string | null;
  whatsapp: string | null;
  email: string | null;
  utm: Record<string, string | null> | null;
  submissions: number | null;
  exported_huggy_at: string | null;
  exported_email_at: string | null;
}

const COLUMNS =
  "id,created_at,nome,whatsapp,email,utm,submissions,exported_huggy_at,exported_email_at";
const TABLE = "black_vip_leads";
const PAGE = 1000;
const CHUNK = 500;

type Res = Promise<{ data: unknown; error: unknown }>;
interface Table {
  select: (c: string) => {
    order: (c: string, o: { ascending: boolean }) => { range: (a: number, b: number) => Res };
  };
  update: (v: Record<string, unknown>) => { in: (c: string, v: (number | string)[]) => Res };
  delete: () => { eq: (c: string, v: number | string) => { select: (c: string) => Res } };
}
const table = () => (supabase as unknown as { from: (t: string) => Table }).from(TABLE);

/** Every row, newest first, read in pages of 1000 (the API's per-request cap). */
export async function loadBlackLeads(): Promise<BlackLead[]> {
  const all: BlackLead[] = [];
  for (let start = 0; start < 200000; start += PAGE) {
    const { data, error } = await table()
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .range(start, start + PAGE - 1);
    if (error) throw new Error("load");
    const page = Array.isArray(data) ? (data as BlackLead[]) : [];
    all.push(...page);
    if (page.length < PAGE) break;
  }
  return all;
}

/** Marks rows as exported (now) in chunks of 500 ids. */
export async function markExported(
  column: "exported_huggy_at" | "exported_email_at",
  ids: (number | string)[],
): Promise<string> {
  const now = new Date().toISOString();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await table()
      .update({ [column]: now })
      .in("id", ids.slice(i, i + CHUNK));
    if (error) throw new Error("update");
  }
  return now;
}

/** Deletes one sign-up for good. Throws when nothing was deleted (no permission or already gone). */
export async function deleteBlackLead(id: number | string) {
  const { data, error } = await table().delete().eq("id", id).select("id");
  if (error || !Array.isArray(data) || data.length === 0) throw new Error("delete");
}

/* ---------- dates in São Paulo time ---------- */

const TZ = "America/Sao_Paulo";
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** "2026-10-16" for the São Paulo calendar day of a moment. */
export const dayKey = (d: Date | string) =>
  dayKeyFmt.format(typeof d === "string" ? new Date(d) : d);

/** The last `n` São Paulo days as keys, oldest first, ending today. */
export function lastDays(n: number, now = new Date()): string[] {
  const today = dayKey(now);
  const [y, m, d] = today.split("-").map(Number);
  const base = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return Array.from({ length: n }, (_, i) =>
    new Date(base - (n - 1 - i) * 86400000).toISOString().slice(0, 10),
  );
}

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Day key moved by n days ("2026-10-16", -1 -> "2026-10-15"). */
export function shiftKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
}

/** Every day key from `from` to `to`, inclusive (capped at 366 days). */
export function keysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to && out.length < 366; k = shiftKey(k, 1)) out.push(k);
  return out;
}

/** The newest sign-ups only, for the live block (cheap to poll). */
export async function loadRecentBlack(n = 10): Promise<BlackLead[]> {
  const { data, error } = await table()
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .range(0, n - 1);
  if (error) throw new Error("load");
  return Array.isArray(data) ? (data as BlackLead[]) : [];
}

/* ---------- phone ---------- */

const digits = (s: string | null) => (s ?? "").replace(/\D/g, "");

/** Brazilian number with country code: 5516999998888. Null when it cannot be one. */
export function phoneE164(raw: string | null): string | null {
  const d = digits(raw);
  const full = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d : `55${d}`;
  return full.length === 12 || full.length === 13 ? full : null;
}

/** "(16) 99999-8888" for display; the raw value when it is not a Brazilian number. */
export function phoneLabel(raw: string | null): string {
  const full = phoneE164(raw);
  if (!full) return raw ?? "";
  const local = full.slice(2);
  const ddd = local.slice(0, 2);
  const n = local.slice(2);
  return `(${ddd}) ${n.length === 9 ? `${n.slice(0, 5)}-${n.slice(5)}` : `${n.slice(0, 4)}-${n.slice(4)}`}`;
}

export const sourceOf = (l: BlackLead) => {
  const s = l.utm?.["utm_source"];
  return s && String(s).trim() ? String(s).trim() : "direto";
};

/* ---------- search ---------- */

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function matches(l: BlackLead, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const qDigits = q.replace(/\D/g, "");
  if (qDigits.length >= 3 && digits(l.whatsapp).includes(qDigits)) return true;
  const f = fold(q);
  return fold(l.nome ?? "").includes(f) || fold(l.email ?? "").includes(f);
}

/* ---------- CSV (semicolon, UTF-8 with BOM, opens right in Excel pt-BR) ---------- */

/** Text typed by visitors could start with = + - @ and run as a formula in Excel. Neutralize it. */
const csvSafe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const esc = (v: unknown) => `"${csvSafe(String(v ?? "")).replace(/"/g, '""')}"`;
const csv = (head: string[], rows: unknown[][]) =>
  "﻿" + [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");

export function huggyCsv(rows: BlackLead[]) {
  return csv(
    ["Nome", "Telefone", "Data cadastro", "Origem"],
    rows.map((l) => [
      l.nome,
      phoneE164(l.whatsapp) ?? digits(l.whatsapp),
      dateTime(l.created_at),
      sourceOf(l),
    ]),
  );
}

export const EMAIL_TAG = "Black November VIP";
export function emailCsv(rows: BlackLead[]) {
  return csv(
    ["Nome", "Email", "Telefone", "Data cadastro", "Tag"],
    rows
      .filter((l) => l.email)
      .map((l) => [
        l.nome,
        l.email,
        phoneE164(l.whatsapp) ?? digits(l.whatsapp),
        dateTime(l.created_at),
        EMAIL_TAG,
      ]),
  );
}

export function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
