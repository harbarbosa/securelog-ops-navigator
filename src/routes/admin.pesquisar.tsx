import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, EmptyState, MediaPanel, PageHeader, StatusBadge, Table, Td, Th, meta } from "@/components/sl/ui";
import { api, type Page } from "@/lib/securelog-api";
import { fmt } from "@/lib/format";

type Reading = {
  id: string;
  code: string;
  occurred_at: string;
  location_name: string;
  camera_id: string | null;
  camera_name: string | null;
  recorder_name: string | null;
  device_id: string;
  device_name: string | null;
};

export const Route = createFileRoute("/admin/pesquisar")({
  head: () => meta("Pesquisar código", "Pesquisa real de leituras registradas no SecureLog."),
  component: Pesquisar,
});

function Pesquisar() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Reading[] | null>(null);
  const [recentes, setRecentes] = useState<string[]>([]);
  const [selected, setSelected] = useState<Reading | null>(null);

  useEffect(() => {
    api<Page<Reading>>("/api/search/readings?limit=5&offset=0")
      .then((r) => setRecentes(r.items.map((x) => x.code)))
      .catch(() => undefined);
  }, []);

  const buscar = (code = q) => {
    if (!code.trim()) return;
    setQ(code);
    setLoading(true);
    api<Page<Reading>>(`/api/search/readings?limit=100&offset=0&code=${encodeURIComponent(code.trim())}`)
      .then((r) => setRes(r.items))
      .catch(() => setRes([]))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <PageHeader title="Pesquisar código" crumbs={["Pesquisar código"]} />
      <Card className="p-6">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); buscar(); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite ou cole o código lido" className="h-12 font-mono text-lg" autoFocus />
          <Button type="submit" className="h-12 px-6" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Pesquisar
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Recentes:
          {recentes.map((code) => <button key={code} onClick={() => buscar(code)} className="rounded-full border bg-muted px-2.5 py-1 font-mono hover:border-brand hover:text-brand">{code}</button>)}
        </div>
      </Card>

      <div className="mt-6">
        {res === null && <Card><EmptyState title="Pesquise um código" text="Informe um código para listar as leituras registradas." /></Card>}
        {res?.length === 0 && <Card><EmptyState icon={<SearchX className="h-6 w-6" />} title="Código não encontrado" text={`Não há leituras registradas para "${q}".`} /></Card>}
        {!!res?.length && (
          <Card title={`${res.length} leitura${res.length === 1 ? "" : "s"} encontrada${res.length === 1 ? "" : "s"}`}>
            <Table head={<><Th>Código</Th><Th>Data e hora</Th><Th>Local</Th><Th>Leitor</Th><Th>Câmera</Th><Th>Gravador</Th></>}>
              {res.map((item) => (
                <tr key={item.id} role="button" tabIndex={0} onClick={() => setSelected(item)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelected(item); }} className="cursor-pointer hover:bg-brand-soft/40 focus:bg-brand-soft/40 focus:outline-none">
                  <Td className="font-mono font-medium">{item.code}</Td>
                  <Td>{fmt(item.occurred_at)}</Td>
                  <Td>{item.location_name}</Td>
                  <Td>{item.device_name ?? item.device_id}</Td>
                  <Td>{item.camera_name ?? "Não vinculada"}</Td>
                  <Td>{item.recorder_name ?? "Não informado"}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes da leitura{selected ? ` — ${selected.code}` : ""}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Código</p><p className="font-mono font-semibold">{selected.code}</p></div>
                <div><p className="text-xs text-muted-foreground">Data e hora</p><p className="font-medium">{fmt(selected.occurred_at)}</p></div>
                <div><p className="text-xs text-muted-foreground">Local</p><p className="font-medium">{selected.location_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Leitor</p><p className="font-medium">{selected.device_name ?? selected.device_id}</p></div>
                <div><p className="text-xs text-muted-foreground">Câmera</p><p className="font-medium">{selected.camera_name ?? "Não vinculada"}</p></div>
                <div><p className="text-xs text-muted-foreground">Gravador</p><p className="font-medium">{selected.recorder_name ?? "Não informado"}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status="sincronizado" /></div>
              </div>
              <MediaPanel camera={selected.camera_name ?? "Câmera não vinculada"} gravador={selected.recorder_name ?? "Gravador não informado"} cameraId={selected.camera_id} data={new Date(selected.occurred_at)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
