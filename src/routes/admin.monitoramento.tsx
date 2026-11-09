import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyState, PageHeader, meta } from "@/components/sl/ui";

export const Route = createFileRoute("/admin/monitoramento")({
  head: () => meta("Monitoramento", "Tela Monitoramento do SecureLog (em construção no protótipo)."),
  component: () => (
    <>
      <PageHeader title="Monitoramento" crumbs={["Monitoramento"]} />
      <Card><EmptyState title="Tela em construção" text="Esta tela ainda será detalhada no protótipo." /></Card>
    </>
  ),
});
