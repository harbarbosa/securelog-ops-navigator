import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Eye, History, Image as ImageIcon, MoreHorizontal, Search, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, EmptyState, Field, PageHeader, Pagination, Select, StatusBadge, Table, Td, Th, meta } from "@/components/sl/ui";
import { cameras, dispositivos, fmt, leituras, locais, usuarios, type Leitura } from "@/lib/mock";

export const Route = createFileRoute("/admin/leituras")({
  head: () => meta("Leituras", "Gerenciamento e filtro das leituras registradas pelos coletores."),
  component: Leituras,
});

const empty = { codigo: "", ini: "", fim: "", usuario: "", local: "", disp: "", cam: "", status: "" };
const statusOpts = ["sincronizado", "pendente", "erro"];

function Leituras() {
  const nav = useNavigate();
  const [f, setF] = useState(empty);
  const [applied, setApplied] = useState(empty);
  const [page, setPage] = useState(1);
  const [hist, setHist] = useState<Leitura | null>(null);
  const set = (k: keyof typeof empty) => (v: string) => setF({ ...f, [k]: v });

  const rows = useMemo(() => leituras.filter((l) =>
    (!applied.codigo || l.codigo.includes(applied.codigo)) &&
    (!applied.usuario || l.usuario === applied.usuario) &&
    (!applied.local || l.local === applied.local) &&
    (!applied.disp || l.dispositivo === applied.disp) &&
    (!applied.cam || l.camera === applied.cam) &&
    (!applied.status || l.status === applied.status) &&
    (!applied.ini || l.data >= new Date(applied.ini)) &&
    (!applied.fim || l.data <= new Date(applied.fim + "T23:59:59"))
  ), [applied]);
  const per = 10;
  const total = Math.max(1, Math.ceil(rows.length / per));
  const shown = rows.slice((page - 1) * per, page * per);

  return (
    <>
      <PageHeader title="Leituras" crumbs={["Leituras"]} actions={<Button variant="outline" onClick={() => toast.success("Exportação gerada", { description: `${rows.length} leituras em leituras_09112026.xlsx (simulado)` })}><Download className="h-4 w-4" />Exportar</Button>} />
      <Card className="mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Código"><Input value={f.codigo} onChange={(e) => set("codigo")(e.target.value)} placeholder="Ex.: 789…" /></Field>
          <Field label="Data inicial"><Input type="date" value={f.ini} onChange={(e) => set("ini")(e.target.value)} /></Field>
          <Field label="Data final"><Input type="date" value={f.fim} onChange={(e) => set("fim")(e.target.value)} /></Field>
          <Field label="Usuário"><Select value={f.usuario} onChange={set("usuario")} placeholder="Todos" options={usuarios.map((u) => u.nome)} /></Field>
          <Field label="Local"><Select value={f.local} onChange={set("local")} placeholder="Todos" options={locais.map((l) => l.nome)} /></Field>
          <Field label="Dispositivo"><Select value={f.disp} onChange={set("disp")} placeholder="Todos" options={dispositivos.map((d) => d.nome)} /></Field>
          <Field label="Câmera"><Select value={f.cam} onChange={set("cam")} placeholder="Todas" options={cameras.map((c) => c.nome)} /></Field>
          <Field label="Status de sincronização"><Select value={f.status} onChange={set("status")} placeholder="Todos" options={statusOpts} /></Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setF(empty); setApplied(empty); setPage(1); }}><X className="h-4 w-4" />Limpar filtros</Button>
          <Button onClick={() => { setApplied(f); setPage(1); }}><Search className="h-4 w-4" />Pesquisar</Button>
        </div>
      </Card>

      <Card>
        {shown.length === 0 ? <EmptyState title="Nenhuma leitura encontrada" text="Ajuste os filtros ou amplie o período de pesquisa." /> : (
          <Table head={<><Th>Código lido</Th><Th>Data e hora</Th><Th>Usuário</Th><Th>Local</Th><Th>Leitor</Th><Th>Câmera</Th><Th>Status</Th><Th className="text-right">Ações</Th></>}>
            {shown.map((l) => (
              <tr key={l.id} className="hover:bg-muted/40">
                <Td className="font-mono">{l.codigo}</Td><Td>{fmt(l.data)}</Td><Td>{l.usuario}</Td><Td>{l.local}</Td><Td>{l.dispositivo}</Td><Td>{l.camera}</Td>
                <Td><StatusBadge status={l.status} /></Td>
                <Td className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Ações"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => nav({ to: "/admin/leituras/$id", params: { id: l.id } })}><Eye className="h-4 w-4" />Ver detalhes</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => nav({ to: "/admin/leituras/$id", params: { id: l.id } })}><ImageIcon className="h-4 w-4" />Pesquisar imagem</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => nav({ to: "/admin/leituras/$id", params: { id: l.id } })}><Video className="h-4 w-4" />Pesquisar vídeo</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setHist(l)}><History className="h-4 w-4" />Ver histórico</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
          <p className="text-sm text-muted-foreground">{rows.length} leituras • página {page} de {total}</p>
          <Pagination page={page} total={total} onPage={setPage} />
        </div>
      </Card>

      <Dialog open={!!hist} onOpenChange={(o) => !o && setHist(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Histórico do código <span className="font-mono">{hist?.codigo}</span></DialogTitle></DialogHeader>
          {hist && (
            <ol className="space-y-3 border-l pl-4">
              {[["Leitura registrada no coletor", 0], ["Enviada ao servidor", 0.1], ["Vinculada à câmera " + hist.camera, 0.12], [hist.status === "sincronizado" ? "Sincronização confirmada" : "Aguardando sincronização", 0.2]].map(([t, m]) => (
                <li key={t as string} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand" />
                  {t}<p className="font-mono text-xs text-muted-foreground">{fmt(new Date(hist.data.getTime() + (m as number) * 60000))}</p>
                </li>
              ))}
            </ol>
          )}
          <Button asChild variant="outline">{hist && <Link to="/admin/leituras/$id" params={{ id: hist.id }}>Abrir detalhes</Link>}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
