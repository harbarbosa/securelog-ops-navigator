import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyState, PageHeader, meta } from "@/components/sl/ui";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => meta("Usuários", "Tela Usuários do SecureLog (em construção no protótipo)."),
  component: () => (
    <>
      <PageHeader title="Usuários" crumbs={["Usuários"]} />
      <Card><EmptyState title="Tela em construção" text="Esta tela ainda será detalhada no protótipo." /></Card>
    </>
  ),
});
