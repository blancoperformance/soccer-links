import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BuyBar } from "@/features/public/BuyBar";
import { GameSheet } from "@/features/public/GameSheet";
import { LICENSE_HELP, LicenseHelp } from "@/features/public/LicenseHelp";
import { getGame, type Game } from "@/features/public/games";
import * as tracking from "@/lib/tracking";

type Cb = (e: Partial<IntersectionObserverEntry>[]) => void;
let observers: { cb: Cb; el: Element | null; opts?: IntersectionObserverInit | undefined }[] = [];

class FakeIO {
  entry: { cb: Cb; el: Element | null; opts?: IntersectionObserverInit | undefined };
  constructor(cb: Cb, opts?: IntersectionObserverInit) {
    this.entry = { cb, el: null, opts };
    observers.push(this.entry);
  }
  observe(el: Element) {
    this.entry.el = el;
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

const blockSees = (isIntersecting: boolean) => {
  const o = observers.find((x) => x.el?.getAttribute("data-testid") === "buy-block");
  expect(o).toBeTruthy();
  act(() => o!.cb([{ isIntersecting }]));
};

const twoLicenses = (): Game => {
  const g = findGame((x) => x.licenses.length === 2 && x.licenses.every((l) => !l.out) && x.platforms.length === 1);
  return g;
};
import gamesJson from "@/features/public/games.json";
function findGame(pred: (g: Game) => boolean): Game {
  const list = (Array.isArray(gamesJson) ? gamesJson : (gamesJson as { games: Game[] }).games) as Game[];
  const g = list.find(pred);
  if (!g) throw new Error("jogo de teste não encontrado");
  return getGame(g.slug) ?? g;
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal("IntersectionObserver", FakeIO);
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

const mount = (g: Game) =>
  render(<GameSheet game={g} whatsapp="5516" onClose={() => {}} onOpenOther={() => {}} />);

describe("barra de compra compacta", () => {
  it("só aparece quando o bloco de compra sai da tela", () => {
    mount(twoLicenses());
    const bar = screen.getByTestId("buy-bar");
    // antes de ler o observer: escondida, sem piscar
    expect(bar.getAttribute("data-show")).toBe("false");
    blockSees(false);
    expect(bar.getAttribute("data-show")).toBe("true");
    expect(bar).toHaveAttribute("aria-hidden", "false");
    blockSees(true);
    expect(bar.getAttribute("data-show")).toBe("false");
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar.className).toContain("invisible");
  });

  it("observa o bloco dentro do scroll da ficha, descontando a faixa da barra", () => {
    mount(twoLicenses());
    const o = observers.find((x) => x.el?.getAttribute("data-testid") === "buy-block")!;
    expect(o.opts?.rootMargin).toBe("0px 0px -72px 0px");
    expect(o.opts?.root).toBeTruthy();
  });

  it("com duas licenças sem escolha, Comprar na barra leva ao bloco e não compra", () => {
    mount(twoLicenses());
    blockSees(false);
    const bar = screen.getByTestId("buy-bar");
    fireEvent.click(bar.querySelector("button")!);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("o bloco de compra fica no conteúdo, com os dois botões por licença", () => {
    mount(twoLicenses());
    const block = screen.getByTestId("buy-block");
    const names = Array.from(block.querySelectorAll("button")).map((b) => b.textContent ?? "");
    expect(names.some((t) => t.includes("Primária"))).toBe(true);
    expect(names.some((t) => t.includes("Secundária"))).toBe(true);
    expect(block.textContent).toContain("Mais escolhida");
    expect(screen.getByTestId("buy-bar").contains(block)).toBe(false);
  });

  it("BuyBar escondida não deixa o botão no foco", () => {
    render(<BuyBar show={false} amount="R$ 49,90" onBuy={() => {}} />);
    expect(screen.getByText("Comprar", { selector: "button" })).toHaveAttribute("tabindex", "-1");
  });

  it("BuyBar visível chama onBuy", () => {
    const onBuy = vi.fn();
    render(<BuyBar show prefix="a partir de" amount="R$ 49,90" onBuy={onBuy} />);
    fireEvent.click(screen.getByRole("button", { name: "Comprar" }));
    expect(onBuy).toHaveBeenCalledTimes(1);
  });
});

describe("explicação de licença na própria ficha", () => {
  it("abre o acordeão sem navegar, com o texto da loja, e mede o clique", () => {
    const spy = vi.spyOn(tracking, "track").mockImplementation(() => {});
    render(<LicenseHelp />);
    const btn = screen.getByRole("button", { name: /Primária ou secundária\?/ });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(spy).toHaveBeenCalledWith("links_clique", { item_name: "Licenças: abriu explicação" });
    for (const l of LICENSE_HELP) expect(document.body.textContent).toContain(l.text);
    expect(document.body.textContent).toContain(
      "Garantia Vitalícia: Joga offline, em qualquer perfil. O jogo fica vinculado à sua conta para sempre.",
    );
    expect(document.body.textContent).toContain(
      "Garantia Vitalícia: Menor investimento. Precisa estar online com a conta logada para jogar.",
    );
    expect(document.body.textContent).not.toMatch(/[—–]/);
    fireEvent.click(btn);
    expect(spy).toHaveBeenCalledTimes(1); // só a abertura é medida
  });

  it("a ficha não tem mais link 'Entenda' que sai da página", () => {
    mount(twoLicenses());
    expect(screen.queryByText(/Entenda/)).toBeNull();
    expect(screen.getByRole("button", { name: /Primária ou secundária\?/ })).toBeInTheDocument();
  });
});
