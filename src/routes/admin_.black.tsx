import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const BlackLeads = lazy(() =>
  import("@/features/admin/black/BlackLeads").then((m) => ({ default: m.BlackLeads })),
);

/** /admin/black: Black 2026 VIP leads. Not nested under /admin (own layout); same login. */
export const Route = createFileRoute("/admin_/black")({
  head: () => ({
    meta: [{ title: "Black November | Painel Soccer Games" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  ssr: false,
  component: BlackPage,
});

function BlackPage() {
  return (
    <div className="min-h-screen bg-[#f5f4f1]">
      <Suspense fallback={null}>
        <BlackLeads />
      </Suspense>
    </div>
  );
}
