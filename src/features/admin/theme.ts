import { useEffect, useSyncExternalStore } from "react";

/** Tema do painel: claro (padrão), escuro ou automático (segue o aparelho). Fica salvo neste navegador. */
export type ThemeChoice = "light" | "dark" | "auto";
const KEY = "sg-painel-tema";
const subs = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "dark" || v === "auto" ? v : "light";
  } catch {
    return "light";
  }
}

let choice: ThemeChoice = typeof window === "undefined" ? "light" : read();

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
  return useSyncExternalStore(
    subscribe,
    () => choice,
    () => "light",
  );
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
