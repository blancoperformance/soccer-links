import { isTrackedHost } from "./tracking";

/** Insert one row into a public "insert-only" table (RLS lets visitors write, never read). */
const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const SUPABASE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

/** A failed insert. `message` stays the HTTP status ("409", "400"...) so existing checks keep working. */
export class InsertError extends Error {
  constructor(
    public status: number,
    /** Postgres/PostgREST error code from the response body, when there is one. */
    public code: string | undefined,
  ) {
    super(String(status));
  }
  /** Same WhatsApp sent recently (anti-spam per number, 23505 -> 409): the person is already registered. */
  get duplicate() {
    return this.status === 409;
  }
  /** Too many entries overall in the last minutes (anti-spam, 54000): not this visitor's fault. */
  get rateLimited() {
    return this.code === "54000";
  }
}

/**
 * Only the real public domain writes to the database (same list as the tracking):
 * previews, vercel.app and localhost are tests. Open the page with ?gravar=1 to save anyway.
 */
function shouldSave(): boolean {
  try {
    return isTrackedHost() || new URLSearchParams(window.location.search).get("gravar") === "1";
  } catch {
    return false;
  }
}

/** Logs a failed save with context only: never the row (it holds names and phone numbers). */
export function logInsertError(table: string, err: unknown) {
  const where = typeof window === "undefined" ? "" : window.location.hostname;
  if (err instanceof InsertError) {
    const kind = err.duplicate ? "duplicado" : err.rateLimited ? "limite de envios" : "falha";
    const log = kind === "falha" ? console.error : console.warn;
    log(
      `[backend] ${table}: ${kind} ao gravar (HTTP ${err.status}, código ${err.code ?? "?"}, ${where})`,
    );
  } else {
    const what = err instanceof Error ? err.message : "erro desconhecido";
    console.error(`[backend] ${table}: falha ao gravar (${what}, ${where})`);
  }
}

export async function insertRow(table: string, row: Record<string, unknown>): Promise<void> {
  if (!shouldSave()) {
    console.info(
      `[backend] ${table}: não gravado (host de teste ${window.location.hostname}). Abra com ?gravar=1 para gravar.`,
    );
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("backend");
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  if (!SUPABASE_KEY.startsWith("sb_")) headers["Authorization"] = `Bearer ${SUPABASE_KEY}`;
  const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${table}`, {
    method: "POST",
    headers,
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
    throw new InsertError(res.status, typeof body?.code === "string" ? body.code : undefined);
  }
}

/**
 * Calls a database function (RPC) that the public key may run, e.g. black_vip_signup.
 * Same test-host rule as insertRow: off the real domain nothing is saved (open with ?gravar=1 to save).
 * Returns null when it did not run (test host), otherwise the function's JSON answer.
 */
export async function callRpc<T = unknown>(
  fn: string,
  args: Record<string, unknown>,
  timeoutMs = 4000,
): Promise<T | null> {
  if (!shouldSave()) {
    console.info(
      `[backend] ${fn}: não executado (host de teste ${window.location.hostname}). Abra com ?gravar=1 para gravar.`,
    );
    return null;
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("backend");
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
  };
  if (!SUPABASE_KEY.startsWith("sb_")) headers["Authorization"] = `Bearer ${SUPABASE_KEY}`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers,
      body: JSON.stringify(args),
      signal: ctl.signal,
      keepalive: true,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
      throw new InsertError(res.status, typeof body?.code === "string" ? body.code : undefined);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

/** Read-only RPC that anyone may call (e.g. black_vip_total). Works on any host. */
export async function readRpc<T = unknown>(fn: string): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
  };
  if (!SUPABASE_KEY.startsWith("sb_")) headers["Authorization"] = `Bearer ${SUPABASE_KEY}`;
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers,
      body: "{}",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
