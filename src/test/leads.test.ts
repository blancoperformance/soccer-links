import { beforeEach, describe, expect, it, vi } from "vitest";

// Each call to .range() takes the next scripted page; .gte() calls are recorded.
const pages: { data: unknown; error: unknown }[] = [];
const filters: [string, string][] = [];
const ordered = { order: () => ({ range: () => Promise.resolve(pages.shift()) }) };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        ...ordered,
        gte: (c: string, v: string) => (filters.push([c, v]), ordered),
      }),
    }),
  },
}));

const { loadLeads, LeadsError } = await import("@/features/admin/data");

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

describe("loadLeads", () => {
  beforeEach(() => {
    pages.length = 0;
    filters.length = 0;
  });

  it("filters by date in the database when given a start", async () => {
    pages.push({ data: rows(2), error: null });
    const since = new Date("2026-10-01T03:00:00.000Z");
    expect(await loadLeads(since)).toHaveLength(2);
    expect(filters).toEqual([["created_at", since.toISOString()]]);
  });

  it("reads every page until a short one", async () => {
    pages.push({ data: rows(1000), error: null }, { data: rows(3), error: null });
    expect(await loadLeads()).toHaveLength(1003);
  });

  it("returns null when the table does not exist", async () => {
    pages.push({ data: null, error: { code: "PGRST205" } });
    expect(await loadLeads()).toBeNull();
  });

  it("throws instead of returning a partial list when a later page fails", async () => {
    pages.push({ data: rows(1000), error: null }, { data: null, error: { code: "57014" } });
    await expect(loadLeads()).rejects.toBeInstanceOf(LeadsError);
  });

  it("throws on other first-page failures", async () => {
    pages.push({ data: null, error: { code: "42501" } });
    await expect(loadLeads()).rejects.toBeInstanceOf(LeadsError);
  });
});
