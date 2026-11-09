import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, MediaPanel, PageHeader, StatusBadge, meta } from "@/components/sl/ui";
import { fmt, leituras } from "@/lib/mock";

export const Route = createFileRoute("/admin/leituras_/$id")({
  loader: ({ params }) => {
    const l = leituras.find((x) => x.id === params.id);
    if (!l) throw notFound();
    return l;
  },
  head: ({ loaderData }) => meta(loaderData ? `Leitura ${loaderData.codigo}` : "Leitura", "Detalhes da leitura com consulta de imagem e vídeo no gravador."),
  component: Detalhe,
});

function Detalhe() {
  const l = Route.useLoaderData();
  const rows: [string, React.ReactNode][] = [
    ["Código", <span className="font-mono">{l.codigo}</span>],
    ["Data e hora", fmt(l.data)], ["Usuário", l.usuario], ["Local", l.local], ["Dispositivo", l.dispositivo],
    ["Câmera associada", l.camera], ["Gravador", l.gravador], ["Status da sincronização", <StatusBadge status={l.status} />],
    ["Identificador da leitura", <span className="font-mono text-xs">{l.id}</span>],
  ];
  return (
    <>
      <PageHeader title="Detalhes da leitura" crumbs={["Leituras", l.codigo]} actions={<Button asChild variant="outline"><Link to="/admin/leituras"><ArrowLeft className="h-4 w-4" />Voltar</Link></Button>} />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card title="Dados da leitura">
          <dl className="divide-y">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 px-5 py-3"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="text-right text-sm font-medium">{v}</dd></div>
            ))}
          </dl>
        </Card>
        <Card title="Mídia do evento"><div className="p-5"><MediaPanel camera={l.camera} gravador={l.gravador} data={l.data} /></div></Card>
      </div>
    </>
  );
}
