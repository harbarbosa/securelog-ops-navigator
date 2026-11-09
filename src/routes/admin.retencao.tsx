import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyState, PageHeader, meta } from "@/components/sl/ui";

export const Route = createFileRoute("/admin/retencao")({
  head: () => meta("Retenção de mídia", "Tela Retenção de mídia do SecureLog (em construção no protótipo)."),
  component: () => (
    <>
      <PageHeader title="Retenção de mídia" crumbs={["Retenção de mídia"]} />
      <Card><EmptyState title="Tela em construção" text="Esta tela ainda será detalhada no protótipo." /></Card>
    </>
  ),
});
