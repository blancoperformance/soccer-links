import { describe, expect, it } from "vitest";
import {
  calendarCells,
  genMsg,
  genSequencia,
  linkDoGrupo,
  pctOff,
  phOf,
  precoPix,
  type Oferta,
} from "@/features/admin/black/plano/logic";

const base: Oferta = {
  id: 1,
  data: "2026-11-20",
  hora: "18:00:00",
  produto: "GTA 6 - Grand Theft Auto VI para PS5",
  slug: null,
  plataforma: "PS5",
  licencas: "Primária",
  preco_de: 449.9,
  preco_por: 399.9,
  link: "https://lojasoccergames.com.br/produtos/gta-6/",
  resp: null,
  obs: null,
  ok_pagina: false,
  ok_arte: false,
  ok_envio: false,
  msg_custom: null,
};

describe("plano da Black", () => {
  it("fases nas datas combinadas", () => {
    expect(phOf("2026-10-26")?.k).toBe("aquece");
    expect(phOf("2026-11-19")?.k).toBe("gta");
    expect(phOf("2026-11-21")?.k).toBe("pre");
    expect(phOf("2026-11-27")?.k).toBe("black");
    expect(phOf("2026-11-30")?.k).toBe("cyber");
    expect(phOf("2026-12-01")).toBeUndefined();
  });
  it("link do grupo leva a origem do Grupo VIP", () => {
    const u = new URL(linkDoGrupo(base.link));
    expect(u.searchParams.get("utm_medium")).toBe("grupo-vip");
    expect(u.searchParams.get("utm_campaign")).toBe("black2026");
    expect(linkDoGrupo("")).toBe("");
  });
  it("mensagem com preço, desconto, licença e sem plataforma duplicada", () => {
    const m = genMsg(base, null);
    expect(m).toContain("PRÉ-BLACK GTA VI");
    expect(m).toContain("*GTA 6 - Grand Theft Auto VI para PS5* com *11% OFF*");
    expect(m).not.toMatch(/PS5 para PS5/);
    expect(m).toContain("De ~R$ 449,90~ por *R$ 399,90*");
    expect(m).toContain("Licença: Primária");
    expect(m).not.toMatch(/estoque|últimas unidades/i);
  });
  it("Pix entra por cima do por", () => {
    expect(precoPix(100, 5)).toBe(95);
    expect(genMsg({ ...base, preco_por: 100, preco_de: 200 }, 5)).toContain(
      "por *R$ 95,00* no Pix",
    );
    expect(pctOff(200, 95)).toBe(53);
  });
  it("sequência do dia com 4 mensagens e o alerta da pré-Black no primeiro dia", () => {
    const s = genSequencia(base, null);
    expect(s.map((x) => x.k)).toEqual(["alerta", "liberacao", "lembrete", "ultima"]);
    expect(s[0]!.texto).toContain("COMEÇOU A PRÉ-BLACK");
    expect(s[1]!.quando).toBe("18:30");
  });
  it("calendário começa na segunda e cobre a campanha toda", () => {
    const c = calendarCells();
    expect(c.length % 7).toBe(0);
    expect(c.filter((x) => x.inRange).length).toBe(36);
  });
});
