/**
 * Anonymous event tracking for the public page.
 * Every event goes to the GTM dataLayer and to the `events` table (see supabase/migrations).
 * No personal data: only an anonymous per-tab session id, what was tapped and where the visit came from.
 */
export type TrackEvent =
  | "page_view"
  | "links_clique"
  | "intent_select"
  | "search"
  | "search_no_result"
  | "quiz_start"
  | "quiz_answer"
  | "quiz_complete"
  | "quiz_result_click"
  | "context_view"
  | "assistant_question"
  | "assistant_result_click"
  /** Purchase funnel (product sheet): size picked, tapped buy (= left for the store checkout), tapped buy without a size. */
  | "size_select"
  | "checkout_click"
  | "buy_no_size"
  /** Black November: cadastro no Grupo VIP. */
  | "black_lead";

type Payload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

/**
 * Microsoft Clarity (gravação de sessões). Opcional: crie um projeto "Links Soccer" no Clarity e
 * coloque o ID em VITE_CLARITY_ID na Vercel. Carrega só no domínio real e nunca nos aparelhos da equipe.
 */
const CLARITY_ID = (import.meta.env["VITE_CLARITY_ID"] as string | undefined)?.trim() || "yz9fgomtef";
export function loadClarity() {
  if (typeof window === "undefined" || !CLARITY_ID || !shouldSend() || window.clarity) return;
  const c = function (...args: unknown[]) {
    (c.q = c.q || []).push(args);
  } as ((...args: unknown[]) => void) & { q?: unknown[] };
  window.clarity = c;
  const t = document.createElement("script");
  t.async = true;
  t.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
  document.head.appendChild(t);
}

/**
 * Google Tag Manager (opcional): o mesmo contêiner da loja, para o Pixel da Meta e o GA4 da loja
 * enxergarem as visitas e os cadastros da bio. ID em VITE_GTM_ID na Vercel (ex.: GTM-NTMSLZ5H).
 * Os eventos já vão para o dataLayer (page_view, checkout_click, black_lead...).
 */
const GTM_ID = (import.meta.env["VITE_GTM_ID"] as string | undefined)?.trim() ?? "";
export function loadGtm() {
  if (typeof window === "undefined" || !/^GTM-[A-Z0-9]+$/.test(GTM_ID) || !shouldSend()) return;
  if (document.getElementById("sg-gtm")) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.id = "sg-gtm";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const SUPABASE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

/** Only the real public domain feeds the dashboard: previews, vercel.app and localhost are tests. */
const TRACKED_HOSTS = ["links.lojasoccergames.com.br"];
const INTERNAL_KEY = "sg:internal";

/** Devices of the Soccer Games team (marked on admin login or with ?interno=1) are not counted. */
export function setInternalDevice(on: boolean) {
  try {
    if (on) window.localStorage.setItem(INTERNAL_KEY, "1");
    else window.localStorage.removeItem(INTERNAL_KEY);
  } catch {
    /* ignore */
  }
}
export function isInternalDevice(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get("interno");
    if (q === "1") setInternalDevice(true);
    if (q === "0") setInternalDevice(false);
    return window.localStorage.getItem(INTERNAL_KEY) === "1";
  } catch {
    return false;
  }
}
/** True on the real public domain (shared with the lead/creator forms in backend.ts). */
export function isTrackedHost(): boolean {
  return TRACKED_HOSTS.includes(window.location.hostname);
}
function shouldSend(): boolean {
  return isTrackedHost() && !isInternalDevice();
}

const cut = (v: unknown, n: number) => (v == null || v === "" ? null : String(v).slice(0, n));

function sessionId(): string {
  try {
    let id = window.sessionStorage.getItem("sg:sid");
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(
        0,
        36,
      );
      window.sessionStorage.setItem("sg:sid", id);
    }
    return id;
  } catch {
    return `nostore-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** UTMs and referrer of the landing, kept for the whole visit. */
function visitContext() {
  try {
    const saved = window.sessionStorage.getItem("sg:visit");
    if (saved) return JSON.parse(saved) as Record<string, string | null>;
    const q = new URLSearchParams(window.location.search);
    const ctx = {
      utm_source: q.get("utm_source"),
      utm_medium: q.get("utm_medium"),
      utm_campaign: q.get("utm_campaign"),
      utm_content: q.get("utm_content"),
      referrer: document.referrer ? new URL(document.referrer).hostname : null,
    };
    window.sessionStorage.setItem("sg:visit", JSON.stringify(ctx));
    return ctx;
  } catch {
    return {};
  }
}

/**
 * Where this visit came from, for the UTMs sent to the store: the landing's utm_source/utm_campaign,
 * else the referrer (instagram.com -> instagram), else Instagram (the bio is the main door).
 */
export function visitOrigin(): { source: string; campaign: string | null } {
  const ctx = visitContext() as Record<string, string | null | undefined>;
  const ref = (ctx["referrer"] ?? "").toLowerCase();
  const fromRef = /instagram/.test(ref)
    ? "instagram"
    : /tiktok/.test(ref)
      ? "tiktok"
      : /facebook|fb\./.test(ref)
        ? "facebook"
        : /youtube|youtu\.be/.test(ref)
          ? "youtube"
          : /whatsapp|wa\.me/.test(ref)
            ? "whatsapp"
            : null;
  const clean = (v: string | null | undefined) =>
    v
      ? v
          .toLowerCase()
          .replace(/[^a-z0-9_.-]/g, "")
          .slice(0, 60) || null
      : null;
  return {
    source: clean(ctx["utm_source"]) ?? fromRef ?? "instagram",
    campaign: clean(ctx["utm_campaign"]),
  };
}

function device(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  return w < 768 ? "mobile" : w < 1100 ? "tablet" : "desktop";
}

/** Maps each event to the two free columns: `item` (what) and `detail` (value). */
function columns(event: TrackEvent, p: Payload): { item: string | null; detail: string | null } {
  switch (event) {
    case "links_clique":
      return { item: cut(p["item_name"], 200), detail: cut(p["item_url"] ?? p["product"], 400) };
    case "intent_select":
      return { item: cut(p["collection"] ?? p["intent"], 200), detail: cut(p["from"], 400) };
    case "search":
    case "search_no_result":
      return { item: null, detail: cut(p["query"], 400) };
    case "quiz_answer":
      return { item: cut(p["question"], 200), detail: cut(p["answer"], 400) };
    case "quiz_complete":
      return { item: cut(p["tags"], 200), detail: cut(p["result"], 400) };
    case "quiz_result_click":
    case "assistant_result_click":
      return { item: cut(p["product"], 200), detail: null };
    case "context_view":
      return { item: cut(p["slug"], 200), detail: null };
    case "assistant_question":
      return { item: null, detail: cut(p["question"], 400) };
    case "size_select":
      return { item: cut(p["product"], 200), detail: cut(p["size"], 400) };
    case "checkout_click":
      // Soccer: "size" is the license (Primária / Secundária). detail: "Primária", "Secundária" or "sem licença (loja)".
      return { item: cut(p["product"], 200), detail: cut(p["detail"], 400) };
    case "buy_no_size":
      return { item: cut(p["product"], 200), detail: null };
    case "black_lead":
      return { item: cut(p["form"], 200), detail: null };
    default:
      return { item: null, detail: null };
  }
}

function sendToBackend(event: TrackEvent, payload: Payload) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !shouldSend()) return;
  const ctx = visitContext();
  const row = {
    session_id: sessionId(),
    event,
    ...columns(event, payload),
    path: cut(window.location.pathname, 300),
    referrer: cut(ctx.referrer, 300),
    device: device(),
    utm_source: cut(ctx.utm_source, 100),
    utm_medium: cut(ctx.utm_medium, 100),
    utm_campaign: cut(ctx.utm_campaign, 100),
    utm_content: cut(ctx.utm_content, 100),
  };
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  if (!SUPABASE_KEY.startsWith("sb_")) headers["Authorization"] = `Bearer ${SUPABASE_KEY}`;
  try {
    // keepalive lets the request finish even when the click opens/leaves the page.
    void fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(row),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking must never break the page */
  }
}

export function track(event: TrackEvent, payload: Payload = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });
  } catch {
    /* ignore */
  }
  sendToBackend(event, payload);
  try {
    // Lets Clarity filter recordings by what the visitor did (e.g. quiz_complete, search_no_result).
    window.clarity?.("event", event);
  } catch {
    /* ignore */
  }
}

/** Small per-device memory (no personal data). Always wrapped: storage can be blocked. */
export const memory = {
  get<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(`sg:${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      window.localStorage.setItem(`sg:${key}`, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
};
