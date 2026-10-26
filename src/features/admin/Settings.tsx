import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  BarChart3,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  LogOut,
  MessageCircle,
  MonitorSmartphone,
  Package,
  Palette,
  RefreshCw,
  Receipt,
  ShieldCheck,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { trackingConfig } from "@/lib/tracking";
import { fmt, loadSystemChecks, type CheckState, type SystemCheck } from "./data";
import { Card, ThemeSwitch } from "./ui";

const CHECKS: { id: string; name: string; what: string; icon: LucideIcon }[] = [
  {
    id: "visitas",
    name: "Contagem de visitas",
    what: "Cada visita e clique do links indo para o banco.",
    icon: BarChart3,
  },
  {
    id: "quiz",
    name: "Contatos do quiz",
    what: "WhatsApp deixado no fim do quiz, com o código da visita.",
    icon: MessageCircle,
  },
  {
    id: "vendas",
    name: "Vendas da loja",
    what: "Pedidos pagos da Nuvemshop que vieram do links.",
    icon: Receipt,
  },
  {
    id: "catalogo",
    name: "Preços e estoque",
    what: "Preço, promoção e esgotado de cada jogo, da loja.",
    icon: Package,
  },
  { id: "black", name: "Grupo VIP da Black", what: "Cadastros da página /black.", icon: Crown },
  {
    id: "plano",
    name: "Plano da Black",
    what: "Calendário de ofertas, quadro do time e acessos.",
    icon: CalendarDays,
  },
];

const STATE: Record<CheckState, { label: string; chip: string; icon: LucideIcon }> = {
  ok: { label: "funcionando", chip: "sg-chip--ok", icon: CheckCircle2 },
  warn: { label: "precisa de atenção", chip: "sg-chip--warn", icon: AlertTriangle },
  bad: { label: "parado", chip: "sg-chip--bad", icon: XCircle },
};

const when = (iso: string | null | undefined, now: number) => {
  if (!iso) return null;
  const m = Math.round((now - Date.parse(iso)) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  if (m < 48 * 60) return `há ${Math.round(m / 60)} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

function CopyText({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="sg-btn sg-btn--s"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        });
      }}
    >
      {ok ? <CheckCircle2 aria-hidden /> : <Copy aria-hidden />} {ok ? "Copiado" : "Copiar"}
    </button>
  );
}

export function SettingsPanel({
  email,
  internal,
  onToggleInternal,
  onSignOut,
  onReset,
}: {
  email: string | undefined;
  internal: boolean;
  onToggleInternal: () => void;
  onSignOut: () => void;
  onReset: () => Promise<void>;
}) {
  const [checks, setChecks] = useState<Record<string, SystemCheck> | null>(null);
  const [checkedAt, setCheckedAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    const r = await loadSystemChecks();
    setChecks(r);
    setCheckedAt(Date.now());
    setBusy(false);
  }, []);
  useEffect(() => {
    void run();
  }, [run]);

  const list = CHECKS.map((c) => ({ ...c, r: checks?.[c.id] }));
  const pending = list.filter((c) => c.r && c.r.state !== "ok");
  const okCount = list.filter((c) => c.r?.state === "ok").length;
  const internalLink = `https://${trackingConfig.hosts[0]}/?interno=1`;

  return (
    <div className="sg-stack">
      {/* ------- saúde ------- */}
      <section className="sg-health" aria-label="Saúde do sistema">
        <header className="sg-health__head">
          <div>
            <span className="sg-health__kicker">checagem do sistema</span>
            <h2 className="sg-health__title">
              {!checks
                ? "Testando cada peça..."
                : pending.length === 0
                  ? "Tudo funcionando."
                  : `${pending.length} ${pending.length === 1 ? "coisa precisa" : "coisas precisam"} de você.`}
            </h2>
            <p className="sg-health__sub">
              {checks
                ? `${okCount} de ${CHECKS.length} ok · testado ${when(new Date(checkedAt).toISOString(), Date.now())}`
                : "Leva poucos segundos."}
              . Cada linha é um teste real, feito agora.
            </p>
          </div>
          <button type="button" className="sg-btn" onClick={() => void run()} disabled={busy}>
            <RefreshCw aria-hidden className={busy ? "sg-spin" : undefined} /> Testar de novo
          </button>
        </header>
        <ul className="sg-health__list">
          {list.map(({ id, name, what, icon: Icon, r }) => {
            const st = r ? STATE[r.state] : null;
            const S = st?.icon;
            return (
              <li key={id} className={`sg-health__row ${r ? `is-${r.state}` : "is-wait"}`}>
                <span className="sg-health__icon" aria-hidden>
                  <Icon />
                </span>
                <span className="sg-health__body">
                  <span className="sg-health__name">
                    {name}
                    {st && S && (
                      <span className={`sg-chip ${st.chip}`}>
                        <S aria-hidden /> {st.label}
                      </span>
                    )}
                    {r?.at && (
                      <span className="sg-health__at">último registro {when(r.at, checkedAt)}</span>
                    )}
                  </span>
                  <span className="sg-health__what">{r ? r.detail : what}</span>
                  {r?.fix && (
                    <span className="sg-health__fix">
                      <b>O que fazer:</b> {r.fix}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sg-grid sg-grid--2">
        {/* ------- rastreamento ------- */}
        <Card
          title="Rastreamento ligado"
          hint="O que este links envia, e para onde. Só no domínio oficial."
          icon={ShieldCheck}
        >
          <dl className="sg-kv">
            <div>
              <dt>Pixel da Meta</dt>
              <dd>
                {trackingConfig.pixel ? (
                  <span className="sg-mono">{trackingConfig.pixel}</span>
                ) : (
                  "desligado"
                )}
                <small>
                  PageView, ViewContent (abriu um jogo) e Lead (quiz). Compra quem manda é a loja.
                </small>
              </dd>
            </div>
            <div>
              <dt>Google Tag Manager</dt>
              <dd>
                {trackingConfig.gtm ? (
                  <span className="sg-mono">{trackingConfig.gtm}</span>
                ) : (
                  "não ligado no links"
                )}
                <small>
                  {trackingConfig.gtm
                    ? "Mesmo contêiner da loja."
                    : "Para ligar no links, cadastrar VITE_GTM_ID=GTM-NTMSLZ5H na Vercel. Antes, tirar o Pixel do código para não contar dobrado."}
                </small>
              </dd>
            </div>
            <div>
              <dt>Microsoft Clarity</dt>
              <dd>
                {trackingConfig.clarity ? (
                  <span className="sg-mono">{trackingConfig.clarity}</span>
                ) : (
                  "desligado"
                )}
                <small>Gravação de sessões, para ver onde as pessoas travam.</small>
              </dd>
            </div>
            <div>
              <dt>Link da loja</dt>
              <dd>
                <span className="sg-mono">utm_medium=bio · fbclid · sgs</span>
                <small>
                  Todo link para a loja leva a origem da visita, o clique do anúncio e o código da
                  visita.
                </small>
              </dd>
            </div>
          </dl>
        </Card>

        {/* ------- este navegador ------- */}
        <Card
          title="Este navegador"
          hint="Visitas da equipe não entram nos números."
          icon={MonitorSmartphone}
          brand
        >
          <div className={`sg-device ${internal ? "is-off" : "is-on"}`}>
            <span className="sg-device__dot" aria-hidden />
            <span>
              <b>{internal ? "Fora da contagem." : "Sendo contado como cliente."}</b>{" "}
              {internal
                ? "Suas visitas aqui não aparecem no painel nem vão para o Pixel."
                : "Suas visitas aqui somam nos números e vão para o Pixel."}
            </span>
          </div>
          <button
            type="button"
            className="sg-btn"
            style={{ marginTop: 12 }}
            onClick={onToggleInternal}
          >
            {internal ? "Voltar a contar este navegador" : "Tirar este navegador da contagem"}
          </button>
          <p className="sg-muted" style={{ margin: "18px 0 8px", fontSize: 13 }}>
            Para tirar o <b>celular</b> de alguém da equipe, abra este link uma vez nele:
          </p>
          <div className="sg-copyline">
            <span className="sg-mono">{internalLink.replace("https://", "")}</span>
            <CopyText text={internalLink} />
          </div>
        </Card>

        {/* ------- conta e tema ------- */}
        <Card title="Conta e aparência" icon={Palette}>
          <dl className="sg-kv">
            <div>
              <dt>Entrou como</dt>
              <dd>
                <span className="sg-mono">{email ?? "-"}</span>
                <small>Só e-mails liberados como admin no Supabase veem o painel.</small>
              </dd>
            </div>
          </dl>
          <span className="sg-label" style={{ display: "block", margin: "16px 0 8px" }}>
            Tema do painel (fica salvo neste navegador)
          </span>
          <ThemeSwitch />
          <button
            type="button"
            className="sg-btn sg-btn--ghost"
            style={{ marginTop: 16 }}
            onClick={onSignOut}
          >
            <LogOut aria-hidden /> Sair do painel
          </button>
        </Card>

        {/* ------- atalhos ------- */}
        <Card title="Atalhos" hint="Abre em outra aba." icon={ExternalLink}>
          <ul className="sg-links">
            {[
              [
                "Links da bio",
                "links.lojasoccergames.com.br",
                "https://links.lojasoccergames.com.br/",
              ],
              [
                "Página do Grupo VIP",
                "links.lojasoccergames.com.br/black",
                "https://links.lojasoccergames.com.br/black",
              ],
              ["Loja", "lojasoccergames.com.br", "https://lojasoccergames.com.br/"],
              [
                "Gerenciador de Eventos da Meta",
                "ver o Pixel recebendo",
                `https://business.facebook.com/events_manager2/list/pixel/${trackingConfig.pixel}/overview`,
              ],
              ["Clarity", "gravações de sessão", "https://clarity.microsoft.com/projects"],
            ].map(([name, sub, href]) => (
              <li key={name}>
                <a href={href} target="_blank" rel="noreferrer">
                  <span>
                    <b>{name}</b>
                    <small>{sub}</small>
                  </span>
                  <ExternalLink aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ------- zona de perigo ------- */}
      <section className="sg-danger" aria-label="Zona de perigo">
        <div>
          <span className="sg-danger__kicker">
            <Trash2 aria-hidden /> zona de perigo
          </span>
          <h3>Zerar as estatísticas</h3>
          <p>
            Apaga <b>todas as visitas, cliques, buscas e respostas do quiz</b> registradas até
            agora, e o painel volta a contar do zero. A lista "foi para a compra e não comprou"
            também recomeça. <b>Não apaga</b> os contatos do quiz, os cadastros da Black nem nada na
            loja. Use só depois de testes. <b>Não dá para desfazer.</b>
          </p>
        </div>
        <div className="sg-danger__act">
          <label htmlFor="sg-zerar" className="sg-label">
            Digite ZERAR para liberar
          </label>
          <input
            id="sg-zerar"
            className="sg-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.toUpperCase())}
            placeholder="ZERAR"
            autoComplete="off"
          />
          <button
            type="button"
            className="sg-btn sg-btn--danger-solid"
            disabled={confirm !== "ZERAR" || resetting}
            onClick={async () => {
              setResetting(true);
              await onReset();
              setResetting(false);
              setConfirm("");
              void run();
            }}
          >
            <Trash2 aria-hidden /> {resetting ? "Apagando..." : "Apagar estatísticas"}
          </button>
        </div>
      </section>
      <p className="sg-muted" style={{ fontSize: 12, margin: 0 }}>
        {fmt(CHECKS.length)} testes · chaves e senhas nunca aparecem aqui: ficam só na Vercel e no
        Supabase.
      </p>
    </div>
  );
}
