import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { games, isGame } from "../features/public/games";
import type { LiveGame } from "../features/public/store";

// Sinais que a Meta lê como golpe na página de links (estudo de 10/11/2026):
// vendedor sem nome, preço riscado sem fonte e porcentagem de desconto gritada.

const jogos = games.filter((g) => isGame(g) && g.platforms.includes("PS5")).slice(0, 3);
const catalogo: Record<string, LiveGame> = Object.fromEntries(
  jogos.map((g) => [
    g.slug,
    {
      id: 1,
      images: [],
      variants: [
        { label: "Primária", price: 59.9, from: 299.9, available: true },
        { label: "Secundária", price: 39.9, from: 99.9, available: true },
      ],
    } as unknown as LiveGame,
  ]),
);

vi.mock("../features/public/store", async (orig) => {
  const real = await orig<typeof import("../features/public/store")>();
  return {
    ...real,
    loadCatalog: () => Promise.resolve(catalogo),
    loadGame: (slug: string) => Promise.resolve(catalogo[slug] ?? null),
  };
});

const { offerDeadlines, seller } = await import("../features/public/content");
const { DealsBanner, Offers, dealsFrom } = await import("../features/public/Offers");

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function cnpjValido(cnpj: string) {
  const n = cnpj.replace(/\D/g, "").split("").map(Number);
  if (n.length !== 14) return false;
  const dv = (len: number) => {
    const pesos =
      len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((s, p, i) => s + p * n[i]!, 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === n[12] && dv(13) === n[13];
}

describe("página de links sem os sinais de golpe", () => {
  it("identifica quem vende com CNPJ válido, WhatsApp e páginas da loja", () => {
    expect(seller.legalName).toBe("Soccer Games LTDA");
    expect(cnpjValido(seller.cnpj)).toBe(true);
    expect(seller.cnpjUrl).toContain(seller.cnpj.replace(/\D/g, ""));
    expect(seller.whatsappUrl).toMatch(/^https:\/\/wa\.me\/5518996366686/);
    expect(seller.refundUrl).toMatch(/^https:\/\/lojasoccergames\.com\.br\//);
    expect(seller.termsUrl).toMatch(/^https:\/\/lojasoccergames\.com\.br\//);
  });

  it("o dia escrito em cada prazo é o mesmo dia do fim (horário de Brasília)", () => {
    for (const p of offerDeadlines) {
      const m = p.text.match(/até (\S{3}) (\d{2})\/(\d{2})$/u);
      expect(m, p.text).not.toBeNull();
      const fim = new Date(new Date(p.endsAt).getTime() - 3 * 3600 * 1000); // UTC-3
      expect(m![1]).toBe(DIAS[fim.getUTCDay()]);
      expect(Number(m![2])).toBe(fim.getUTCDate());
      expect(Number(m![3])).toBe(fim.getUTCMonth() + 1);
    }
  });

  it("a oferta mostra o menor preço do jogo (a partir de)", () => {
    const [d] = dealsFrom(catalogo, new Set([jogos[0]!.slug]));
    expect(d!.license).toBe("Primária");
    expect(d!.min).toBe(39.9);
  });

  it("faixa e caça-ofertas renderizados sem porcentagem, OFF ou preço riscado", async () => {
    const { container } = render(
      <div>
        <DealsBanner onGo={() => {}} />
        <Offers onOpen={() => {}} />
      </div>,
    );
    await screen.findByText(`${jogos.length} jogos em oferta`);
    expect(await screen.findAllByText("R$ 39,90")).not.toHaveLength(0);
    const texto = container.textContent ?? "";
    expect(texto).not.toMatch(/%/);
    expect(texto).not.toMatch(/\bOFF\b/);
    expect(texto).not.toMatch(/economiza/i);
    expect(container.querySelector(".line-through")).toBeNull();

    // gira a roleta: o prêmio é onde ficavam o "-87%", o riscado e o "Você economiza"
    vi.useFakeTimers();
    try {
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Girar a roleta" }));
      });
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
    } finally {
      vi.useRealTimers();
    }
    expect(screen.getByRole("button", { name: "Quero esse" })).toBeInTheDocument();
    const depois = container.textContent ?? "";
    expect(depois).toMatch(/a partir de/);
    expect(depois).not.toMatch(/%/);
    expect(depois).not.toMatch(/\bOFF\b/);
    expect(depois).not.toMatch(/economiza/i);
    expect(container.querySelector(".line-through")).toBeNull();
  });

  it("riscado só existe dentro da ficha do produto", () => {
    const pasta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../features/public");
    for (const f of [
      "Offers.tsx",
      "GameCard.tsx",
      "BagBar.tsx",
      "PublicPage.tsx",
      "Categories.tsx",
    ]) {
      expect(readFileSync(path.join(pasta, f), "utf8"), f).not.toMatch(/line-through/);
    }
  });
});
