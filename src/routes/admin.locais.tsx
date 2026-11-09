import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyState, PageHeader, meta } from "@/components/sl/ui";

export const Route = createFileRoute("/admin/locais")({
  head: () => meta("Locais", "Tela Locais do SecureLog (em construção no protótipo)."),
  component: () => (
    <>
      <PageHeader title="Locais" crumbs={["Locais"]} />
      <Card><EmptyState title="Tela em construção" text="Esta tela ainda será detalhada no protótipo." /></Card>
    </>
  ),
});
