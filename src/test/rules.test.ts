import { describe, expect, it } from "vitest";
import { withUtm } from "@/lib/utm";
import { itemStatus } from "@/lib/schedule";
import type { LinkItem } from "@/features/public/content";

describe("withUtm", () => {
  it("adds all 4 UTMs to lojasoccergames.com.br links", () => {
    const u = new URL(
      withUtm("https://lojasoccergames.com.br/produtos/gta-5/", { content: "racer" }),
    );
    expect(u.searchParams.get("utm_source")).toBe("instagram");
    expect(u.searchParams.get("utm_medium")).toBe("bio");
    expect(u.searchParams.get("utm_campaign")).toBe("sempre-ativo");
    expect(u.searchParams.get("utm_content")).toBe("racer");
  });
  it("keeps an existing utm_source", () => {
    const u = new URL(
      withUtm("https://lojasoccergames.com.br/?utm_source=stories", { content: "x" }),
    );
    expect(u.searchParams.get("utm_source")).toBe("stories");
  });
  it("leaves mailto, wa.me, internal and other sites alone", () => {
    for (const url of [
      "mailto:soccerg810@gmail.com",
      "https://wa.me/5518996366686",
      "/black",
      "https://www.youtube.com/@soccergamesofc",
    ]) {
      expect(withUtm(url, { content: "x" })).toBe(url);
    }
  });
});

describe("itemStatus", () => {
  const base: LinkItem = {
    id: "a",
    type: "link",
    title: "A",
    url: "https://x.com",
    slug: "a",
    visible: true,
  };
  const now = new Date("2026-10-14T12:00:00Z");
  it("hides future-scheduled items", () =>
    expect(itemStatus({ ...base, startsAt: "2026-10-15T00:00:00Z" }, now)).toBe("scheduled"));
  it("hides expired items", () =>
    expect(itemStatus({ ...base, endsAt: "2026-10-13T00:00:00Z" }, now)).toBe("expired"));
  it("hides items with empty URL", () =>
    expect(itemStatus({ ...base, url: "" }, now)).toBe("no-url"));
  it("hides quiz without questions", () =>
    expect(itemStatus({ ...base, type: "quiz", url: "" }, now)).toBe("no-quiz"));
});
