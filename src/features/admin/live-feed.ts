import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";

export interface Ev {
  id: number;
  created_at: string;
  session_id: string;
  event: string;
  item: string | null;
  detail: string | null;
  device: string | null;
  utm_source: string | null;
}

/** How far back the live feed looks. */
export const FEED_MIN = 30;
/** Each refresh re-reads this much before the newest event already held, so late inserts are not missed. */
const OVERLAP_MS = 60000;

/** Events of the last 30 min (newest first), or only those from `after` on when given. */
export async function loadRecent(after?: string): Promise<Ev[] | null> {
  const windowStart = Date.now() - FEED_MIN * 60000;
  const since = new Date(
    after ? Math.max(windowStart, Date.parse(after)) : windowStart,
  ).toISOString();
  const { data, error } = await db
    .from("events")
    .select("id,created_at,session_id,event,item,detail,device,utm_source")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000);
  return error ? null : (data ?? []);
}

/** New rows merged into the held ones: no duplicates, newest first, nothing older than the feed window. */
export function mergeRecent(held: Ev[], fresh: Ev[], now = Date.now()): Ev[] {
  const cutoff = now - FEED_MIN * 60000;
  const byId = new Map<number, Ev>();
  for (const e of [...fresh, ...held]) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()]
    .filter((e) => Date.parse(e.created_at) >= cutoff)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

/**
 * Polls the feed while the tab is visible. The first read takes the whole 30-min window; after
 * that only the last minute or so is read and merged, instead of re-reading up to 1000 rows.
 */
export function useRecentEvents(refreshMs: number) {
  const [events, setEvents] = useState<Ev[] | null | undefined>(undefined);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const held = useRef<Ev[] | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (document.hidden) return;
      const prev = held.current;
      const newest = prev?.[0] ? Date.parse(prev[0].created_at) : Date.now();
      const rows = await loadRecent(prev ? new Date(newest - OVERLAP_MS).toISOString() : undefined);
      if (!alive) return;
      // A failed read drops what is held, so the next one starts over from the full window.
      held.current = rows === null ? null : prev ? mergeRecent(prev, rows) : rows;
      setEvents(held.current);
      setFetchedAt(Date.now());
    };
    void tick();
    const id = window.setInterval(() => void tick(), refreshMs);
    const onVis = () => !document.hidden && void tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshMs]);

  return { events, fetchedAt };
}
