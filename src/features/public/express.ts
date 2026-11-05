/**
 * Entrega Expressa (R$ 5, produto não listado da loja) oferecida na hora da compra.
 * Entra no fim do sgadd, sem opção de licença: o script da loja só põe a variação quando há texto
 * depois do segundo hífen, então "produto-variante" sozinho funciona.
 */
import { useSyncExternalStore } from "react";

export const EXPRESS_ITEM = "378787215-1632559625";
export const EXPRESS_PRICE = 5;
/** O script da loja lê no máximo 12 itens do sgadd. */
export const SGADD_MAX = 12;

const KEY = "sg:express";
let on = false;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    on = sessionStorage.getItem(KEY) === "1";
  } catch {
    /* sem storage: vale só na memória */
  }
}

export const express = {
  get: () => (load(), on),
  set(v: boolean) {
    load();
    on = v;
    try {
      sessionStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

export function useExpress(): boolean {
  return useSyncExternalStore(express.subscribe, express.get, () => false);
}

/** Cabe a Expressa no sgadd junto com os jogos? */
export const expressFits = (games: number) => games < SGADD_MAX;
