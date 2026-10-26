import { useState } from "react";
import { Trash2 } from "lucide-react";

/** Trash button that asks once ("Apagar de vez?") before calling onConfirm. */
export function ConfirmDelete({
  name,
  onConfirm,
}: {
  name: string;
  onConfirm: () => Promise<void>;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!asking)
    return (
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setAsking(true);
        }}
        className="sg-btn sg-btn--ghost sg-btn--s sg-btn--icon sg-btn--danger"
        aria-label={`Apagar ${name}`}
        title="Apagar contato"
      >
        <Trash2 aria-hidden />
      </button>
    );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 13 }}>
      <span style={{ color: "var(--sg-text-2)" }}>
        {failed ? "Não apagou. Tentar de novo?" : "Apagar de vez?"}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } catch {
            setFailed(true);
            setBusy(false);
          }
        }}
        className="sg-btn sg-btn--s sg-btn--danger-solid"
      >
        {busy ? "Apagando..." : "Apagar"}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="sg-btn sg-btn--s sg-btn--ghost"
      >
        Cancelar
      </button>
    </div>
  );
}
