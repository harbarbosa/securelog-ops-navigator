import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CameraFrame, Field, PageHeader, Select, StatusBadge, Table, Td, Th, meta } from "@/components/sl/ui";
import { FormDialog } from "@/components/sl/crud";
import { NOW, cameras as seed, gravadores, locais } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cameras")({
  head: () => meta("Câmeras", "Cadastro de câmeras, canais e vínculo com locais e gravadores."),
  component: Cameras,
});
type C = (typeof seed)[number];
const blank: C = { id: "", nome: "", local: locais[0]!.nome, gravador: gravadores[0]!.nome, canal: 1, tipo: "Dome IP 2MP", descricao: "", status: "online" };

function Cameras() {
  const [rows, setRows] = useState(seed);
  const [sel, setSel] = useState<C>(seed[0]!);
  const [edit, setEdit] = useState<C | null>(null);
  const save = () => {
    if (!edit!.nome) { toast.error("Informe o nome da câmera"); return; }
    setRows(edit!.id ? rows.map((r) => (r.id === edit!.id ? edit! : r)) : [...rows, { ...edit!, id: crypto.randomUUID() }]);
    toast.success("Câmera salva"); setEdit(null);
  };
  return (
    <>
      <PageHeader title="Câmeras" crumbs={["Configurações", "Câmeras"]} actions={<Button onClick={() => setEdit(blank)}><Plus className="h-4 w-4" />Nova câmera</Button>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <Table head={<><Th>Nome</Th><Th>Local</Th><Th>Gravador</Th><Th>Canal</Th><Th>Tipo</Th><Th>Status</Th><Th /></>}>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => setSel(r)} className={cn("cursor-pointer hover:bg-muted/40", sel.id === r.id && "bg-brand-soft")}>
                <Td className="font-medium">{r.nome}</Td><Td>{r.local}</Td><Td>{r.gravador}</Td><Td>{r.canal}</Td><Td>{r.tipo}</Td><Td><StatusBadge status={r.status} /></Td>
                <Td><Button size="icon" variant="ghost" aria-label="Editar" onClick={(e) => { e.stopPropagation(); setEdit(r); }}><Pencil className="h-4 w-4" /></Button></Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Pré-visualização">
          <div className="space-y-2 p-5">
            <CameraFrame camera={sel.nome} time={NOW} offline={sel.status === "offline"}>
              {sel.status !== "offline" && <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">● AO VIVO</span>}
            </CameraFrame>
            <p className="text-sm text-muted-foreground">{sel.descricao} • {sel.gravador} canal {sel.canal}</p>
          </div>
        </Card>
      </div>
      {edit && (
        <FormDialog open onOpenChange={() => setEdit(null)} title={edit.id ? "Editar câmera" : "Nova câmera"} onSave={save}>
          <Field label="Nome"><Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
          <Field label="Local"><Select value={edit.local} onChange={(v) => setEdit({ ...edit, local: v })} options={locais.map((l) => l.nome)} /></Field>
          <Field label="Gravador"><Select value={edit.gravador} onChange={(v) => setEdit({ ...edit, gravador: v })} options={gravadores.map((g) => g.nome)} /></Field>
          <Field label="Canal"><Input type="number" value={edit.canal} onChange={(e) => setEdit({ ...edit, canal: Number(e.target.value) })} /></Field>
          <Field label="Descrição" className="sm:col-span-2"><Textarea value={edit.descricao} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></Field>
          <Field label="Status"><Select value={edit.status} onChange={(v) => setEdit({ ...edit, status: v as C["status"] })} options={["online", "offline", "inativo"]} /></Field>
        </FormDialog>
      )}
    </>
  );
}
