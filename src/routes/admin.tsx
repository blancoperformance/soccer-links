import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Dashboard = lazy(() =>
  import("@/features/admin/Dashboard").then((m) => ({ default: m.Dashboard })),
);

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Painel | Links Soccer Games" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  ssr: false,
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={null}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
