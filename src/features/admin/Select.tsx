import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type SelectTone = "brand" | "ok" | "warn" | "bad" | "muted";
export interface SelectOption<V extends string> {
  value: V;
  label: string;
  hint?: string;
  tone?: SelectTone;
}

/**
 * Seletor do painel (substitui o <select> do navegador): botão com a cor do estado, lista
 * flutuante com teclado (setas, Enter, Esc, primeira letra) e abre para cima quando falta espaço.
 */
export function Select<V extends string>({
  value,
  options,
  onChange,
  label,
  size = "m",
  className = "",
  disabled = false,
}: {
  value: V;
  options: SelectOption<V>[];
  onChange: (v: V) => void;
  label: string;
  size?: "s" | "m";
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({});
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const cur = options.find((o) => o.value === value) ?? options[0];

  const show = () => {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };
  const pick = (v: V) => {
    setOpen(false);
    btn.current?.focus();
    if (v !== value) onChange(v);
  };

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect();
      const need = Math.min(320, options.length * 44 + 12);
      const isUp = window.innerHeight - r.bottom < need + 90 && r.top > need;
      const width = Math.max(r.width, 180);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setUp(isUp);
      setPos(
        isUp
          ? { left, minWidth: width, bottom: window.innerHeight - r.top + 6 }
          : { left, minWidth: width, top: r.bottom + 6 },
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !list.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open)
      list.current
        ?.querySelector<HTMLElement>(`[data-i="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + options.length) % options.length);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const o = options[active];
      if (o) pick(o.value);
    } else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const i = options.findIndex((o, j) => j > active && o.label.toLowerCase().startsWith(k));
      const j = i >= 0 ? i : options.findIndex((o) => o.label.toLowerCase().startsWith(k));
      if (j >= 0) setActive(j);
    }
  };

  return (
    <div ref={root} className={`sg-sel sg-sel--${size} ${open ? "is-open" : ""} ${className}`}>
      <button
        ref={btn}
        type="button"
        className={`sg-sel__btn ${cur?.tone ? `is-${cur.tone}` : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${cur?.label ?? ""}`}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
      >
        {cur?.tone && <span className="sg-sel__dot" aria-hidden />}
        <span className="sg-sel__val">{cur?.label}</span>
        <ChevronDown aria-hidden className="sg-sel__chev" />
      </button>
      {open &&
        createPortal(
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            aria-activedescendant={`${id}-${active}`}
            className={`sg-sel__list ${up ? "is-up" : ""}`}
            style={pos}
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-${i}`}
                data-i={i}
                role="option"
                aria-selected={o.value === value}
                className={`sg-sel__opt ${i === active ? "is-active" : ""} ${o.tone ? `is-${o.tone}` : ""}`}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o.value)}
              >
                {o.tone && <span className="sg-sel__dot" aria-hidden />}
                <span className="sg-sel__text">
                  <span>{o.label}</span>
                  {o.hint && <small>{o.hint}</small>}
                </span>
                {o.value === value && <Check aria-hidden className="sg-sel__check" />}
              </li>
            ))}
          </ul>,
          (root.current?.closest(".sgp") as HTMLElement | null) ?? document.body,
        )}
    </div>
  );
}
