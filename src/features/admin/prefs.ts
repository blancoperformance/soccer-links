/** Preferências do painel Links, salvas neste navegador: tela que abre e período que abre. */
export interface PanelPrefs {
  /** "ultima" = abre na última tela usada. */
  home: string;
  /** 0 = abre no último período usado. */
  days: 0 | 1 | 7 | 30 | 90;
}
const KEY = "sg:painel:prefs";
const DEFAULT: PanelPrefs = { home: "ultima", days: 0 };

export function readPrefs(): PanelPrefs {
  try {
    const p = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<PanelPrefs> | null;
    const days = [0, 1, 7, 30, 90].includes(Number(p?.days))
      ? (Number(p?.days) as PanelPrefs["days"])
      : 0;
    return { home: typeof p?.home === "string" ? p.home : "ultima", days };
  } catch {
    return DEFAULT;
  }
}

export function savePrefs(p: PanelPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sem storage: vale só nesta visita */
  }
}
