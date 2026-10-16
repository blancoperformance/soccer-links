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
 * (`black_vip_is_admin`); any error counts as "no".
 */
export function canOpenBlack(userId: string): Promise<boolean> {
  if (cache?.userId === userId) return cache.result;
  const result = Promise.resolve(db.rpc("black_vip_is_admin"))
    .then(({ data, error }) => !error && data === true)
    .catch(() => false);
  cache = { userId, result };
  return result;
}

export function forgetBlackAccess() {
  cache = null;
}
