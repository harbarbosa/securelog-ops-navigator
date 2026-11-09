import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo, meta } from "@/components/sl/ui";

export const Route = createFileRoute("/mobile")({
  head: () => meta("Coletor Zebra", "Aplicativo SecureLog para o coletor Zebra (em construção no protótipo)."),
  component: () => (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div className="card-surface max-w-sm p-8">
        <div className="mb-4 flex justify-center"><Logo size="lg" /></div>
        <p className="text-sm text-muted-foreground">O aplicativo do coletor ainda será montado no protótipo.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-brand hover:underline">Voltar ao login</Link>
      </div>
    </div>
  ),
});
