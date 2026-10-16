import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
const { mergeRecent } = await import("@/features/admin/live-feed");

const now = Date.parse("2026-10-16T15:00:00.000Z");
const ev = (id: number, minAgo: number) => ({
  id,
  created_at: new Date(now - minAgo * 60000).toISOString(),
  session_id: "s",
  event: "page_view",
  item: null,
  detail: null,
  device: null,
  utm_source: null,
});

describe("mergeRecent", () => {
  it("adds new events without duplicating the overlap, newest first", () => {
    const held = [ev(3, 1), ev(2, 2), ev(1, 10)];
    const fresh = [ev(5, 0), ev(4, 0.5), ev(3, 1)]; // id 3 comes again (overlap)
    expect(mergeRecent(held, fresh, now).map((e) => e.id)).toEqual([5, 4, 3, 2, 1]);
  });

  it("drops events that left the 30-minute window", () => {
    expect(mergeRecent([ev(2, 29), ev(1, 31)], [], now).map((e) => e.id)).toEqual([2]);
  });
});
