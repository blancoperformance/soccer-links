import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronsUpDown,
  LogOut,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  setTheme,
  useThemeChoice,
  useResolvedTheme,
  usePageBackground,
  ThemeDefault,
  type ThemeChoice,
} from "./theme";
import type { Workspace } from "./workspace";
import { useFaviconBadge } from "./favicon";

/** Raiz do painel: aplica o tema (claro, escuro ou automático) em tudo que está dentro. */
export function PanelRoot({
  children,
  forceLight = false,
  prefer = "light",
}: {
  children: ReactNode;
  forceLight?: boolean;
  /** Tema de quem ainda não escolheu: o Black abre no escuro. */
  prefer?: ThemeChoice;
}) {
  return (
    <ThemeDefault.Provider value={prefer}>
      <PanelTheme forceLight={forceLight}>{children}</PanelTheme>
    </ThemeDefault.Provider>
  );
}

function PanelTheme({ children, forceLight }: { children: ReactNode; forceLight: boolean }) {
  const theme = useResolvedTheme();
  const t = forceLight ? "light" : theme;
  usePageBackground(t);
  return (
    <div className="sgp" data-theme={t}>
      {children}
    </div>
  );
}

export function Logo({ size = 38 }: { size?: number }) {
  return (
    <img
      src="/logo-soccer.png"
      alt="Soccer Games"
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

export function Card({
  title,
  hint,
  icon: Icon,
  brand = false,
  action,
  children,
  className = "",
  flush = false,
  id,
}: {
  title?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  /** Ícone em violeta suave em vez do círculo escuro. */
  brand?: boolean;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`sg-card ${flush ? "sg-card--flush" : ""} ${className}`}>
      {title && (
        <header className="sg-card__head">
          {Icon && (
            <span className={`sg-card__icon ${brand ? "sg-card__icon--brand" : ""}`} aria-hidden>
              <Icon />
            </span>
          )}
          <div className="sg-card__titles">
            <h2 className="sg-card__title">{title}</h2>
            {hint && <p className="sg-card__hint">{hint}</p>}
          </div>
          {action && <div className="sg-card__action">{action}</div>}
        </header>
      )}
      <div className="sg-card__body">{children}</div>
    </section>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="sg-label">{children}</p>;
}

export function Note({
  tone = "neutral",
  children,
  icon: Icon,
  onClose,
}: {
  tone?: "neutral" | "bad" | "warn" | "brand" | "ok";
  children: ReactNode;
  icon?: LucideIcon;
  onClose?: () => void;
}) {
  return (
    <div className={`sg-note sg-note--${tone}`} role={tone === "bad" ? "alert" : undefined}>
      {Icon && <Icon aria-hidden />}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {onClose && (
        <button
          type="button"
          className="sg-btn sg-btn--ghost sg-btn--s sg-btn--icon"
          onClick={onClose}
          aria-label="Fechar aviso"
          style={{ marginTop: -6, marginRight: -8 }}
        >
          <X />
        </button>
      )}
    </div>
  );
}

const THEMES: { id: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "auto", label: "Auto", icon: Monitor },
];

export function ThemeSwitch() {
  const c = useThemeChoice();
  return (
    <div className="sg-theme" role="group" aria-label="Tema">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={c === t.id}
          onClick={() => setTheme(t.id)}
          title={t.id === "auto" ? "Segue o tema do aparelho" : undefined}
        >
          <t.icon aria-hidden />
          {t.label}
        </button>
      ))}
    </div>
  );
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Número no selo (ex.: contatos a chamar). */
  badge?: number | undefined;
  /** Ponto pulsando: tela em tempo real. */
  live?: boolean;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

const initials = (email?: string) => {
  const name = (email ?? "?").split("@")[0] ?? "?";
  const parts = name.split(/[._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
};

function NavLinks({
  groups,
  current,
  onNav,
}: {
  groups: NavGroup[];
  current: string;
  onNav: (id: string) => void;
}) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.label}>
          <p className="sg-nav__group">{g.label}</p>
          {g.items.map((it) => (
            <button
              key={it.id}
              type="button"
              className="sg-nav__link"
              aria-current={it.id === current ? "page" : undefined}
              onClick={() => onNav(it.id)}
              title={it.label}
            >
              <it.icon aria-hidden />
              <span className="sg-nav__text">{it.label}</span>
              {it.badge ? (
                <span className="sg-nav__badge">{it.badge}</span>
              ) : it.live ? (
                <span className="sg-dot sg-dot--live sg-nav__live" aria-label="em tempo real" />
              ) : null}
            </button>
          ))}
        </div>
      ))}
    </>
  );
}

/** Menu recolhido ou aberto, salvo por pessoa (e-mail) neste navegador. */
function useMiniMenu(email: string | undefined) {
  const key = `sg:painel:menu:${email ?? "anon"}`;
  const [mini, setMini] = useState(false);
  useEffect(() => {
    try {
      setMini(window.localStorage.getItem(key) === "mini");
    } catch {
      /* sem storage */
    }
  }, [key]);
  const toggle = () =>
    setMini((v) => {
      const n = !v;
      try {
        window.localStorage.setItem(key, n ? "mini" : "full");
      } catch {
        /* sem storage */
      }
      return n;
    });
  // Ctrl+B (Cmd+B no Mac) recolhe e abre
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "b") {
        const t = e.target as HTMLElement | null;
        if (t?.isContentEditable) return;
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [mini, toggle] as const;
}

const WS: { id: Workspace; label: string }[] = [
  { id: "links", label: "Links" },
  { id: "black", label: "Black 2026" },
];

/**
 * Estrutura do painel: menu de console à esquerda (computador), barra de baixo com 4 atalhos + Menu
 * (celular), topo com título, linha de apoio e ferramentas.
 */
export function Shell({
  workspace,
  canSwitch,
  onSwitch,
  product,
  email,
  onSignOut,
  groups,
  current,
  onNav,
  tabs,
  eyebrow,
  title,
  sub,
  tools,
  alert = 0,
  children,
}: {
  workspace: Workspace;
  canSwitch: boolean;
  onSwitch: (w: Workspace) => void;
  product: string;
  email: string | undefined;
  onSignOut: () => void;
  groups: NavGroup[];
  current: string;
  onNav: (id: string) => void;
  /** Até 4 telas para a barra do celular (a 5ª posição é o Menu). */
  tabs: string[];
  eyebrow?: ReactNode;
  title: string;
  sub?: ReactNode;
  tools?: ReactNode;
  /** Quantas coisas esperando: vira o pontinho no ícone da aba e o número no título. */
  alert?: number;
  children: ReactNode;
}) {
  useFaviconBadge(alert);
  const [mini, toggleMini] = useMiniMenu(email);
  const [account, setAccount] = useState(false);
  const [sheet, setSheet] = useState(false);
  const accRef = useRef<HTMLDivElement>(null);
  const all = groups.flatMap((g) => g.items);

  useEffect(() => {
    if (!account) return;
    const onDown = (e: PointerEvent) => {
      if (!accRef.current?.contains(e.target as Node)) setAccount(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAccount(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [account]);

  // Folha do celular aberta: Esc fecha e a página de trás não rola.
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  const nav = (id: string) => {
    setSheet(false);
    onNav(id);
  };
  const switchWs = (w: Workspace) => {
    setSheet(false);
    if (w !== workspace) onSwitch(w);
  };
  const currentItem = all.find((x) => x.id === current);

  return (
    <>
      <aside className={`sg-side ${mini ? "is-mini" : ""}`} aria-label="Menu do painel">
        <div className="sg-side__brand">
          <Logo />
          <div className="sg-side__product">
            <span>Painel Soccer</span>
            <strong>{product}</strong>
          </div>
          <button
            type="button"
            className="sg-side__fold"
            onClick={toggleMini}
            aria-label={mini ? "Fixar o menu aberto" : "Recolher o menu"}
            title={`${mini ? "Fixar o menu aberto" : "Recolher o menu"} (Ctrl+B)`}
          >
            {mini ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
          </button>
        </div>
        {canSwitch && (
          <div className="sg-ws" role="group" aria-label="Trocar de painel">
            {WS.map((w) => (
              <button
                key={w.id}
                type="button"
                aria-current={w.id === workspace ? "page" : undefined}
                onClick={() => switchWs(w.id)}
              >
                {w.label}
              </button>
            ))}
          </div>
        )}
        <nav className="sg-nav" aria-label="Telas">
          <NavLinks groups={groups} current={current} onNav={nav} />
        </nav>
        <div className="sg-side__foot" ref={accRef}>
          {account && (
            <div className="sg-pop" role="menu" aria-label="Sua conta">
              <div className="sg-pop__who">
                <strong>Equipe Soccer Games</strong>
                <span>{email}</span>
              </div>
              <p className="sg-pop__label">Tema</p>
              <ThemeSwitch />
              <button
                type="button"
                role="menuitem"
                className="sg-pop__item sg-pop__item--out"
                onClick={onSignOut}
              >
                <LogOut aria-hidden /> Sair
              </button>
            </div>
          )}
          <button
            type="button"
            className="sg-me"
            aria-expanded={account}
            aria-haspopup="menu"
            onClick={() => setAccount((v) => !v)}
          >
            <span className="sg-avatar" aria-hidden>
              {initials(email)}
            </span>
            <span className="sg-me__text">
              <strong>{email?.split("@")[0] ?? "Conta"}</strong>
              <span>Tema, conta e sair</span>
            </span>
            <ChevronsUpDown aria-hidden />
          </button>
        </div>
      </aside>

      <div className={`sg-main ${mini ? "is-mini" : ""}`}>
        <div className="sg-mtop">
          <Logo size={32} />
          <div className="sg-mtop__title">
            <span>{product}</span>
            <strong>{currentItem?.label ?? title}</strong>
          </div>
          <button
            type="button"
            className="sg-btn sg-btn--icon"
            onClick={() => setSheet(true)}
            aria-label="Abrir o menu"
          >
            <Menu />
          </button>
        </div>

        <header className="sg-top">
          <div className="sg-top__text">
            {eyebrow && <div className="sg-eyebrow">{eyebrow}</div>}
            <h1>{title}</h1>
            {sub && <p className="sg-top__sub">{sub}</p>}
          </div>
          {tools && <div className="sg-tools">{tools}</div>}
        </header>

        <main className="sg-content" key={current}>
          {children}
        </main>
      </div>

      <nav className="sg-tabbar" aria-label="Atalhos">
        {tabs.map((id) => {
          const it = all.find((x) => x.id === id);
          if (!it) return null;
          return (
            <button
              key={id}
              type="button"
              aria-current={id === current ? "page" : undefined}
              onClick={() => nav(id)}
            >
              <it.icon aria-hidden />
              <span>{it.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setSheet(true)}
          aria-expanded={sheet}
          aria-current={!tabs.includes(current) ? "page" : undefined}
        >
          <Menu aria-hidden />
          <span>Menu</span>
        </button>
      </nav>

      {sheet && (
        <>
          <button
            type="button"
            className="sg-veil"
            aria-label="Fechar o menu"
            onClick={() => setSheet(false)}
          />
          <div className="sg-sheet" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="sg-sheet__grab" aria-hidden />
            <div className="sg-sheet__head">
              <strong>Todas as telas</strong>
              <button
                type="button"
                className="sg-sheet__close"
                onClick={() => setSheet(false)}
                aria-label="Fechar"
              >
                <X />
              </button>
            </div>
            {canSwitch && (
              <div
                className="sg-ws"
                role="group"
                aria-label="Trocar de painel"
                style={{ margin: "0 0 4px" }}
              >
                {WS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    aria-current={w.id === workspace ? "page" : undefined}
                    onClick={() => switchWs(w.id)}
                    style={{ height: 40 }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            )}
            <NavLinks groups={groups} current={current} onNav={nav} />
            <div className="sg-sheet__theme">
              <ThemeSwitch />
              <p className="sg-sheet__who">{email}</p>
              <button type="button" className="sg-sheet__out" onClick={onSignOut}>
                <LogOut aria-hidden /> Sair do painel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Ponto vivo + texto em mono, para "ao vivo", "atualizado às". */
export function LiveTag({ children }: { children: ReactNode }) {
  return (
    <span className="sg-eyebrow">
      <span className="sg-dot sg-dot--live" aria-hidden />
      {children}
    </span>
  );
}

/** Garante que componentes que usam o tema dentro do painel saibam qual está ativo. */
export const useTheme = useResolvedTheme;

export interface BoardCell {
  label: string;
  value: string;
  sub?: ReactNode;
  accent?: boolean;
  onClick?: (() => void) | undefined;
}

/**
 * Placar: a assinatura da Soccer. Faixa escura de estádio com os números do período em fonte de
 * painel eletrônico, o selo de transmissão ao vivo e a faixa dos dias embaixo.
 */
export function Scoreboard({
  label,
  live,
  cells,
  bars,
  barsLabel,
  actions,
}: {
  label: string;
  live?: { text: string; onClick?: () => void } | undefined;
  cells: BoardCell[];
  bars?: { key: string; label: string; value: number }[];
  barsLabel?: ReactNode;
  actions?: ReactNode;
}) {
  const max = Math.max(1, ...(bars ?? []).map((b) => b.value));
  const peak = (bars ?? []).findIndex((b) => b.value === max);
  return (
    <section className="sg-board" aria-label={label}>
      <header className="sg-board__head">
        <span className="sg-board__title">{label}</span>
        {live &&
          (live.onClick ? (
            <button type="button" className="sg-board__live" onClick={live.onClick}>
              <span className="sg-board__rec" aria-hidden />
              ao vivo · {live.text}
            </button>
          ) : (
            <span className="sg-board__live">
              <span className="sg-board__rec" aria-hidden />
              ao vivo · {live.text}
            </span>
          ))}
        {actions && <span className="sg-board__actions">{actions}</span>}
      </header>
      <div
        className="sg-board__cells"
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
      >
        {cells.map((c) => {
          const inner = (
            <>
              <span className="sg-board__label">{c.label}</span>
              <span className="sg-board__value">{c.value}</span>
              {c.sub && <span className="sg-board__sub">{c.sub}</span>}
            </>
          );
          const cls = `sg-board__cell ${c.accent ? "is-accent" : ""}`;
          return c.onClick ? (
            <button key={c.label} type="button" className={cls} onClick={c.onClick}>
              {inner}
            </button>
          ) : (
            <div key={c.label} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
      {bars && bars.length > 0 && (
        <div className="sg-board__strip">
          <div
            className="sg-board__bars"
            role="img"
            aria-label={`${typeof barsLabel === "string" ? barsLabel : "Por dia"}: ${bars.map((b) => b.value).join(", ")}`}
          >
            {bars.map((b, i) => (
              <span
                key={b.key}
                className={`sg-board__bar ${i === peak ? "is-peak" : ""}`}
                title={`${b.label}: ${b.value.toLocaleString("pt-BR")}`}
              >
                <i style={{ height: `${Math.max(6, (b.value / max) * 100)}%` }} />
              </span>
            ))}
          </div>
          {barsLabel && <span className="sg-board__strip-label">{barsLabel}</span>}
        </div>
      )}
    </section>
  );
}

/**
 * Esqueleto do painel enquanto a tela carrega ou troca entre Links e Black: a barra lateral
 * fica parada no lugar e só o conteúdo pisca, então a troca não parece um recarregamento.
 */
export function ShellBoot({ workspace = "links" }: { workspace?: Workspace }) {
  return (
    <>
      <aside className="sg-side" aria-hidden>
        <div className="sg-side__brand">
          <Logo />
          <div className="sg-side__product">
            <span>Painel Soccer</span>
            <strong>{workspace === "black" ? "Black Friday 2026" : "Links da bio"}</strong>
          </div>
        </div>
        <div className="sg-ws">
          {WS.map((w) => (
            <button
              key={w.id}
              type="button"
              tabIndex={-1}
              aria-current={w.id === workspace ? "page" : undefined}
            >
              {w.label}
            </button>
          ))}
        </div>
        <div className="sg-boot__nav">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="sg-boot__line" style={{ width: `${62 + ((i * 17) % 30)}%` }} />
          ))}
        </div>
      </aside>
      <div className="sg-main" aria-busy="true" aria-label="Carregando o painel">
        <div className="sg-mtop">
          <Logo size={32} />
          <div className="sg-mtop__title">
            <span>{workspace === "black" ? "Black Friday 2026" : "Links da bio"}</span>
            <strong>Carregando</strong>
          </div>
        </div>
        <div className="sg-content">
          <div className="sg-stack">
            <span className="sg-skel" style={{ height: 22, width: 220 }} />
            <span className="sg-skel" style={{ height: 230 }} />
            <div className="sg-grid sg-grid--split">
              <span className="sg-skel" style={{ height: 260 }} />
              <span className="sg-skel" style={{ height: 260 }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
