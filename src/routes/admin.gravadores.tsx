import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyState, PageHeader, meta } from "@/components/sl/ui";

export const Route = createFileRoute("/admin/gravadores")({
  head: () => meta("Gravadores", "Tela Gravadores do SecureLog (em construção no protótipo)."),
  component: () => (
    <>
      <PageHeader title="Gravadores" crumbs={["Gravadores"]} />
      <Card><EmptyState title="Tela em construção" text="Esta tela ainda será detalhada no protótipo." /></Card>
    </>
  ),
});
