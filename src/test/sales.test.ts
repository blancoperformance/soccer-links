import { describe, expect, it } from "vitest";
import { fetchLinkSales, landingParams, toLinkSale } from "@/lib/sales";

describe("vendas do links", () => {
  it("lê as UTMs de dentro do link de cupom", () => {
    const p = landingParams(
      "https://lojasoccergames.com.br/discount/BIO1?redirect_to=%2Fcomprar%2F%3Fsg%3D1%26utm_source%3Dinstagram%26utm_medium%3Dbio%26utm_content%3Dsacola%26sgs%3Dvisita-123",
    );
    expect(p?.get("utm_medium")).toBe("bio");
    expect(p?.get("utm_source")).toBe("instagram");
    expect(p?.get("utm_content")).toBe("sacola");
    expect(p?.get("sgs")).toBe("visita-123");
  });

  it("conta pelo link, pelo cupom, e ignora o resto", () => {
    const viaLink = toLinkSale(
      {
        number: 101,
        total: "89.90",
        landing_url: "https://lojasoccergames.com.br/produtos/fc26/?utm_source=tiktok&utm_medium=bio&utm_campaign=semana3",
        coupon: [],
        products: [{ name: "FC 26", quantity: 1, price: "89.90" }],
      },
      "BIO1",
    );
    expect(viaLink).toMatchObject({ via: "link", source: "tiktok", campaign: "semana3", total: 89.9, sid: null });

    const viaCupom = toLinkSale(
      { number: 102, total: 50, landing_url: "https://lojasoccergames.com.br/", coupon: [{ code: "bio1" }] },
      "BIO1",
    );
    expect(viaCupom).toMatchObject({ via: "cupom", source: null, coupon: "bio1" });

    expect(
      toLinkSale({ number: 103, total: 50, landing_url: "https://lojasoccergames.com.br/?utm_medium=cpc" }, "BIO1"),
    ).toBeNull();
  });

  it("soma a loja, pula cancelado e avisa sem permissão", async () => {
    const orders = [
      { number: 1, total: "100", landing_url: "/?utm_medium=bio", created_at: "2026-10-20T10:00:00Z" },
      { number: 2, total: "50", landing_url: "/", created_at: "2026-10-20T11:00:00Z" },
      { number: 3, total: "70", status: "cancelled", landing_url: "/?utm_medium=bio" },
    ];
    const ok = (async () => new Response(JSON.stringify(orders))) as unknown as typeof fetch;
    const rep = await fetchLinkSales("1", "t", new Date(0), new Date(), "BIO1", ok);
    expect(rep).toMatchObject({ storeOrders: 2, storeRevenue: 150, truncated: false });
    expect(rep.sales.map((s) => s.number)).toEqual([1]);

    const denied = (async () => new Response("{}", { status: 403 })) as unknown as typeof fetch;
    await expect(fetchLinkSales("1", "t", new Date(0), new Date(), "BIO1", denied)).rejects.toThrow("scope");
  });
});
