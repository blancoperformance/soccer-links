import { useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { track } from "@/lib/tracking";
import { bag, bagTotals, bagUrl, useBag } from "./bag";
import { brl } from "./store";
import { bagEnabled } from "./content";

/** Barra fixa da sacola: total, economia e "Finalizar" com todos os jogos de uma vez. */
export function BagBar() {
  const list = useBag();
  const [open, setOpen] = useState(false);
  if (!bagEnabled || list.length === 0) return null;
  const { total, save } = bagTotals(list);
  const go = () => {
    const url = bagUrl(list, "sacola");
    track("checkout_click", { product: list.map((i) => i.slug).join(","), detail: `sacola ${list.length}`, value: total, currency: "BRL" });
    track("links_clique", { item_name: `Sacola: finalizar ${list.length}`, item_url: url });
    window.location.href = url;
  };
  return (
    <>
    <div aria-hidden className="h-24" />
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[560px] overflow-hidden rounded-[20px] border border-mts-btn-border bg-white text-mts-text shadow-[0_6px_20px_-10px_rgba(0,0,0,.25)]">
        {open && (
          <ul className="max-h-[45vh] divide-y divide-mts-btn-border overflow-y-auto px-4 pt-2">
            {list.map((i) => (
              <li key={i.slug} className="flex items-center gap-3 py-2.5">
                {i.image ? (
                  <img src={i.image} alt="" className="h-11 w-11 rounded-lg object-cover" />
                ) : (
                  <span className="h-11 w-11 rounded-lg bg-mts-column" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-[13px] font-semibold">{i.name}</span>
                  <span className="text-xs text-mts-muted">
                    {i.license}
                    {i.price != null && ` · ${brl(i.price)}`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => bag.remove(i.slug)}
                  aria-label={`Tirar ${i.name} da sacola`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-mts-column"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-3 p-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-expanded={open}
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mts-column">
              <ShoppingBag className="h-5 w-5" aria-hidden />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff2d87] px-1 text-[11px] font-black">
                {list.length}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-extrabold leading-tight">{brl(total)}</span>
              <span className="block truncate text-[11px] text-[#1a9d5a]">
                {save > 0 ? `Economia de ${brl(save)}` : open ? "Toque para fechar" : "Ver a sacola"}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={go}
            className="h-11 shrink-0 rounded-[14px] bg-[#8a00c2] px-4 text-sm font-extrabold text-white"
          >
            Finalizar →
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
