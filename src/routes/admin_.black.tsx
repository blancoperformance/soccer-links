import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PanelRoot, ShellBoot } from "@/features/admin/ui";
import "@/features/admin/painel.css";

const BlackLeads = lazy(() =>
  import("@/features/admin/black/BlackLeads").then((m) => ({ default: m.BlackLeads })),
);

/** /admin/black: Black 2026 VIP leads. Not nested under /admin (own layout); same login. */
export const Route = createFileRoute("/admin_/black")({
  head: () => ({
    meta: [
      { title: "Black November | Painel Soccer Games" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  ssr: false,
  component: BlackPage,
});

function BlackPage() {
  return (
    <PanelRoot>
      <Suspense fallback={<ShellBoot workspace="black" />}>
        <BlackLeads />
      </Suspense>
    </PanelRoot>
  );
}
