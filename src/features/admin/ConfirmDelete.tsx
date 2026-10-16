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
        className="flex h-9 w-9 shrink-0 items-center justify-center border border-transparent text-neutral-400 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        aria-label={`Apagar ${name}`}
        title="Apagar contato"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );

  return (
    <div className="flex shrink-0 items-center gap-2 text-xs">
      <span className="text-neutral-600">
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
        className="h-8 bg-red-700 px-3 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Apagando..." : "Apagar"}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="h-8 px-2 text-neutral-500 hover:text-neutral-950"
      >
        Cancelar
      </button>
    </div>
  );
}
