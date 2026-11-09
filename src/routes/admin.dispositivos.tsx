import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyState, PageHeader, meta } from "@/components/sl/ui";

export const Route = createFileRoute("/admin/dispositivos")({
  head: () => meta("Dispositivos", "Tela Dispositivos do SecureLog (em construção no protótipo)."),
  component: () => (
    <>
      <PageHeader title="Dispositivos" crumbs={["Dispositivos"]} />
      <Card><EmptyState title="Tela em construção" text="Esta tela ainda será detalhada no protótipo." /></Card>
    </>
  ),
});
