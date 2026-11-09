import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyState, PageHeader, meta } from "@/components/sl/ui";

export const Route = createFileRoute("/admin/cameras")({
  head: () => meta("Câmeras", "Tela Câmeras do SecureLog (em construção no protótipo)."),
  component: () => (
    <>
      <PageHeader title="Câmeras" crumbs={["Câmeras"]} />
      <Card><EmptyState title="Tela em construção" text="Esta tela ainda será detalhada no protótipo." /></Card>
    </>
  ),
});
