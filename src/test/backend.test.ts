import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let production = true;
vi.mock("@/lib/tracking", () => ({ isTrackedHost: () => production }));
vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

const { insertRow, InsertError, logInsertError } = await import("@/lib/backend");

const reply = (status: number, body: unknown = null) =>
  vi.fn().mockResolvedValue(new Response(body ? JSON.stringify(body) : null, { status }));
const row = { name: "Maria Teste", whatsapp: "16999998888" };

describe("insertRow", () => {
  beforeEach(() => {
    production = true;
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not write outside the production host", async () => {
    production = false;
    const fetch = reply(201);
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(console, "info").mockImplementation(() => {});
    await insertRow("leads", row);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("writes on a test host when the page has ?gravar=1", async () => {
    production = false;
    window.history.replaceState(null, "", "/?gravar=1");
    const fetch = reply(201);
    vi.stubGlobal("fetch", fetch);
    await insertRow("leads", row);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("tells a duplicate (409) apart from the overall rate limit (54000) and real failures", async () => {
    vi.stubGlobal("fetch", reply(409, { code: "23505" }));
    const dup = await insertRow("leads", row).catch((e: unknown) => e);
    expect(dup).toBeInstanceOf(InsertError);
    expect((dup as InstanceType<typeof InsertError>).duplicate).toBe(true);
    expect((dup as Error).message).toBe("409");

    vi.stubGlobal("fetch", reply(500, { code: "54000" }));
    const limit = (await insertRow("leads", row).catch((e: unknown) => e)) as InstanceType<
      typeof InsertError
    >;
    expect(limit.rateLimited).toBe(true);
    expect(limit.duplicate).toBe(false);

    vi.stubGlobal("fetch", reply(500));
    const fail = (await insertRow("leads", row).catch((e: unknown) => e)) as InstanceType<
      typeof InsertError
    >;
    expect([fail.duplicate, fail.rateLimited, fail.code]).toEqual([false, false, undefined]);
  });

  it("logs failures without any personal data", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logInsertError("leads", new InsertError(500, "23514"));
    const line = String(error.mock.calls[0]?.[0]);
    expect(line).toContain("leads");
    expect(line).toContain("500");
    expect(line).not.toContain(row.name);
    expect(line).not.toContain(row.whatsapp);
  });
});
