import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, ThemeSwitch } from "./ui";

/**
 * Conta e segurança: troca de senha conferindo a atual antes, e opção de sair dos outros
 * aparelhos. A senha nunca fica salva no painel: vai direto para o login do Supabase.
 */
export function AccountCard({
  email,
  onSignOut,
}: {
  email: string | undefined;
  onSignOut: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [others, setOthers] = useState(true);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const problem = !next
    ? null
    : next.length < 8
      ? "A senha nova precisa de pelo menos 8 caracteres."
      : again && next !== again
        ? "As duas senhas novas não batem."
        : next === current
          ? "A senha nova é igual à atual."
          : null;
  const ready = Boolean(email && current && next && again && !problem);

  const submit = async () => {
    if (!ready || !email) return;
    setBusy(true);
    setMsg(null);
    // confere a senha atual antes de trocar
    const check = await supabase.auth.signInWithPassword({ email, password: current });
    if (check.error) {
      setBusy(false);
      setMsg({ ok: false, text: "A senha atual não confere." });
      return;
    }
    const up = await supabase.auth.updateUser({ password: next });
    if (up.error) {
      setBusy(false);
      setMsg({ ok: false, text: "Não deu para trocar agora. Tente de novo em alguns minutos." });
      return;
    }
    if (others) await supabase.auth.signOut({ scope: "others" });
    setBusy(false);
    setCurrent("");
    setNext("");
    setAgain("");
    setMsg({
      ok: true,
      text: others ? "Senha trocada. Os outros aparelhos foram desconectados." : "Senha trocada.",
    });
  };

  const type = show ? "text" : "password";
  return (
    <Card title="Conta e segurança" icon={KeyRound}>
      <dl className="sg-kv">
        <div>
          <dt>Entrou como</dt>
          <dd>
            <span className="sg-mono">{email ?? "-"}</span>
            <small>Só e-mails liberados no Supabase entram no painel.</small>
          </dd>
        </div>
      </dl>
      <form
        className="sg-pass"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          type="email"
          name="username"
          value={email ?? ""}
          autoComplete="username"
          readOnly
          hidden
        />
        <label className="sg-pass__field">
          <span className="sg-label">Senha atual</span>
          <input
            className="sg-input"
            type={type}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label className="sg-pass__field">
          <span className="sg-label">Senha nova</span>
          <input
            className="sg-input"
            type={type}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="sg-pass__field">
          <span className="sg-label">Repita a senha nova</span>
          <input
            className="sg-input"
            type={type}
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="sg-check">
          <input type="checkbox" checked={others} onChange={(e) => setOthers(e.target.checked)} />
          Sair dos outros aparelhos depois de trocar
        </label>
        {problem && <p className="sg-pass__msg is-bad">{problem}</p>}
        {msg && (
          <p className={`sg-pass__msg ${msg.ok ? "is-ok" : "is-bad"}`} role="status">
            {msg.ok && <CheckCircle2 aria-hidden />} {msg.text}
          </p>
        )}
        <div className="sg-pass__row">
          <button type="submit" className="sg-btn" disabled={!ready || busy}>
            {busy ? "Trocando..." : "Trocar a senha"}
          </button>
          <button type="button" className="sg-btn sg-btn--ghost" onClick={() => setShow((v) => !v)}>
            {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />} {show ? "Esconder" : "Mostrar"}
          </button>
        </div>
      </form>
      <span className="sg-label" style={{ display: "block", margin: "18px 0 8px" }}>
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
  );
}

/** O que o painel guarda e por quê (LGPD). */
export function PrivacyCard() {
  return (
    <Card title="Dados e privacidade" icon={ShieldCheck}>
      <div className="sg-prose">
        <p>
          O painel guarda <b>visitas e cliques</b> do links sem nome nem documento, só com um código
          aleatório por aparelho. Serve para saber o que funciona na página.
        </p>
        <p>
          <b>Contatos do quiz e cadastros do Grupo VIP</b> têm nome, WhatsApp e, às vezes, e-mail.
          Só entram com o consentimento marcado na hora, e servem para mandar as ofertas da Soccer.
        </p>
        <p>
          Quem pedir para sair ou apagar os dados é atendido pelo WhatsApp da loja, e o contato é
          apagado da base. Só a equipe com login vê esses dados, e cada exportação fica marcada com
          a data.
        </p>
      </div>
    </Card>
  );
}
