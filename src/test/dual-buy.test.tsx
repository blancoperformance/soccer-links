import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BlackHero } from "@/features/public/BlackHero";
import { buyMode, DualBuy, dualLabel, type BuyOption } from "@/features/public/DualBuy";
import { getGame } from "@/features/public/games";
import { weeklyPromotion } from "@/features/public/promotion";

const prim: BuyOption = { key: "primaria", label: "Primária", out: false, price: 89.9 };
const sec: BuyOption = { key: "secundaria", label: "Secundária", out: false, price: 49.9 };
const nbsp = (s: string) => s.replace(/ /g, " ");

describe("regra dos dois botões de compra", () => {
  it("duas licenças sem escolha: dois botões, primária primeiro, com preço", () => {
    expect(buyMode([sec, prim], null)).toBe("dual");
    const onBuy = vi.fn();
    render(<DualBuy options={[sec, prim]} onBuy={onBuy} />);
    const btns = screen.getAllByRole("button");
    expect(btns.map((b) => nbsp(b.textContent ?? ""))).toEqual([
      "Primária · R$ 89,90",
      "Secundária · R$ 49,90",
    ]);
    expect(btns[0]!.className).toContain("bg-mts-ink");
    expect(btns[1]!.className).toContain("border-2");
    expect(btns.every((b) => b.getAttribute("aria-pressed") === null)).toBe(true);
    fireEvent.click(btns[1]!);
    expect(onBuy).toHaveBeenCalledWith("secundaria");
  });

  it("uma licença só, ou licença já escolhida, mantém o botão único", () => {
    expect(buyMode([prim], null)).toBe("single");
    expect(buyMode([prim, sec], "primaria")).toBe("single");
    expect(buyMode([prim, sec], "secundaria")).toBe("single");
  });

  it("licença esgotada fica desabilitada com 'esgotada'; tudo esgotado volta ao botão único", () => {
    const out = { ...sec, out: true };
    expect(buyMode([prim, out], null)).toBe("dual");
    expect(dualLabel(out)).toBe("Secundária · esgotada");
    const onBuy = vi.fn();
    render(<DualBuy options={[prim, out]} onBuy={onBuy} />);
    const b = screen.getByRole("button", { name: "Secundária · esgotada" });
    expect(b).toBeDisabled();
    fireEvent.click(b);
    expect(onBuy).not.toHaveBeenCalled();
    expect(buyMode([{ ...prim, out: true }, out], null)).toBe("single");
  });

  it("sem preço ao vivo mostra só o nome da licença", () => {
    expect(dualLabel({ ...prim, price: null })).toBe("Primária");
  });
});

describe("capas do topo da Black", () => {
  it("abrem a ficha do jogo com aria-label e sem travessão", () => {
    const open = vi.fn();
    render(<BlackHero weekTheme onBrowse={() => {}} onOpenGame={open} />);
    const slug = weeklyPromotion.highlights[0]!;
    const game = getGame(slug)!;
    fireEvent.click(screen.getByRole("button", { name: `Ver ${game.name}` }));
    expect(open).toHaveBeenCalledWith(game);
    expect(weeklyPromotion.highlights.length).toBe(3);
    expect(renderToStaticMarkup(<BlackHero weekTheme onBrowse={() => {}} onOpenGame={open} />)).not.toMatch(/[—–]/);
  });
});
