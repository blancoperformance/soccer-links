import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

/**
 * Tema do painel: claro, escuro ou automático (segue o aparelho). Fica salvo neste navegador.
 * Sem escolha salva, cada painel abre no seu padrão: o Links no claro, o Black no escuro.
 */
export type ThemeChoice = "light" | "dark" | "auto";
const KEY = "sg-painel-tema";
const subs = new Set<() => void>();

function read(): ThemeChoice | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "dark" || v === "auto" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

let choice: ThemeChoice | null = typeof window === "undefined" ? null : read();

/** Padrão do painel aberto (quando a pessoa ainda não escolheu um tema). */
export const ThemeDefault = createContext<ThemeChoice>("light");

export function setTheme(t: ThemeChoice) {
  choice = t;
  try {
    window.localStorage.setItem(KEY, t);
  } catch {
    /* sem storage: vale só nesta aba */
  }
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", f);
  return () => {
    subs.delete(f);
    mq.removeEventListener("change", f);
  };
};

export function useThemeChoice(): ThemeChoice {
  const fallback = useContext(ThemeDefault);
  const c = useSyncExternalStore(
    subscribe,
    () => choice,
    () => null,
  );
  return c ?? fallback;
}

/** "light" ou "dark" de verdade, já resolvendo o automático. */
export function useResolvedTheme(): "light" | "dark" {
  const c = useThemeChoice();
  const dark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  return c === "auto" ? (dark ? "dark" : "light") : c;
}

/** Pinta o fundo da página inteira com o tema (evita faixa clara ao rolar além do conteúdo). */
export function usePageBackground(theme: "light" | "dark") {
  useEffect(() => {
    const bg = theme === "dark" ? "#0b0912" : "#f4f3f8";
    const prev = document.body.style.background;
    document.body.style.background = bg;
    document.documentElement.style.colorScheme = theme;
    return () => {
      document.body.style.background = prev;
      document.documentElement.style.colorScheme = "";
    };
  }, [theme]);
}
