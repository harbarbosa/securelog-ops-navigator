import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, EmptyState, MediaPanel, PageHeader, StatusBadge, meta } from "@/components/sl/ui";
import { fmt, leituras, type Leitura } from "@/lib/mock";

export const Route = createFileRoute("/admin/pesquisar")({
  head: () => meta("Pesquisar código", "Pesquisa operacional de um código lido e consulta da mídia no gravador."),
  component: Pesquisar,
});

function Pesquisar() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Leitura | null | "nao">(null);
  const recentes = leituras.slice(0, 5).map((l) => l.codigo);

  const buscar = (code = q) => {
    if (!code.trim()) return;
    setQ(code); setLoading(true);
    setTimeout(() => { setLoading(false); setRes(leituras.find((l) => l.codigo === code.trim()) ?? "nao"); }, 800);
  };

  return (
    <>
      <PageHeader title="Pesquisar código" crumbs={["Pesquisar código"]} />
      <Card className="p-6">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); buscar(); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite ou cole o código lido" className="h-12 font-mono text-lg" autoFocus />
          <Button type="submit" className="h-12 px-6" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Pesquisar no gravador</Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Recentes:
          {recentes.map((c) => <button key={c} onClick={() => buscar(c)} className="rounded-full border bg-muted px-2.5 py-1 font-mono hover:border-brand hover:text-brand">{c}</button>)}
        </div>
      </Card>

      <div className="mt-6">
        {res === null && <Card><EmptyState title="Pesquise um código" text="Informe o código para localizar a última leitura e consultar a imagem e o vídeo do momento do evento." /></Card>}
        {res === "nao" && <Card><EmptyState icon={<SearchX className="h-6 w-6" />} title="Código não encontrado" text={`Não há leituras registradas para "${q}". Confira o código ou tente outro período.`} /></Card>}
        {res && res !== "nao" && (
          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <Card title="Última leitura encontrada">
              <dl className="divide-y">
                {([["Código", <span className="font-mono">{res.codigo}</span>], ["Data e hora do evento", fmt(res.data)], ["Local", res.local], ["Câmera", res.camera], ["Gravador", res.gravador],
                  ["Período consultado", `${fmt(new Date(res.data.getTime() - 30000))} até ${fmt(new Date(res.data.getTime() + 30000))}`], ["Status", <StatusBadge status={res.status} />]] as [string, React.ReactNode][]).map(([k, v]) => (
                  <div key={k} className="px-5 py-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-sm font-medium">{v}</dd></div>
                ))}
              </dl>
            </Card>
            <Card title="Snapshot e vídeo"><div className="p-5"><MediaPanel key={res.id} camera={res.camera} gravador={res.gravador} data={res.data} /></div></Card>
          </div>
        )}
      </div>
    </>
  );
}
