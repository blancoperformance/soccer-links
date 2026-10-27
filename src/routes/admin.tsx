import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PanelRoot, ShellBoot } from "@/features/admin/ui";
import "@/features/admin/painel.css";

const Dashboard = lazy(() =>
  import("@/features/admin/Dashboard").then((m) => ({ default: m.Dashboard })),
);

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Soccer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

function AdminPage() {
  return (
    <PanelRoot>
      <Suspense fallback={<ShellBoot workspace="links" />}>
        <Dashboard />
      </Suspense>
    </PanelRoot>
  );
}
