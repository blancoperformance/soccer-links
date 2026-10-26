import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";

/**
 * Two panels share one login: "links" (link-in-bio stats, /admin) and "black" (Black 2026 VIP
 * leads, /admin/black). The last choice is kept on this browser and opened directly next time.
 */
export type Workspace = "links" | "black";

const KEY = "sg:painel:workspace";

export function getWorkspace(): Workspace | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "links" || v === "black" ? v : null;
  } catch {
    return null;
  }
}

export function setWorkspace(w: Workspace) {
  try {
    window.localStorage.setItem(KEY, w);
  } catch {
    /* ignore */
  }
}

let cache: { userId: string; result: Promise<boolean> } | null = null;

/**
 * True when the logged-in user may open the Black 2026 panel. The database decides
 * (`black_vip_is_admin`) or the Black plan team (`black_papel`); any error counts as "no".
 */
export function canOpenBlack(userId: string): Promise<boolean> {
  if (cache?.userId === userId) return cache.result;
  const vip = Promise.resolve(db.rpc("black_vip_is_admin"))
    .then(({ data, error }) => !error && data === true)
    .catch(() => false);
  // Equipe do plano da Black (black_papel). Sem o SQL do plano a função não existe: conta como não.
  const team = Promise.resolve((db as unknown as SupabaseClient).rpc("black_papel"))
    .then(({ data, error }) => !error && (data === "editor" || data === "leitor"))
    .catch(() => false);
  const result = Promise.all([vip, team]).then((r) => r.some(Boolean));
  cache = { userId, result };
  return result;
}

export function forgetBlackAccess() {
  cache = null;
}
