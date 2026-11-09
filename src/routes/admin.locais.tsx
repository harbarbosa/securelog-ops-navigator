import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CameraFrame, Confirm, Field, PageHeader, Select, StatusBadge, Table, Td, Th, meta } from "@/components/sl/ui";
import { FormDialog } from "@/components/sl/crud";
import { NOW, cameras, fmt, gravadores, locais as seed } from "@/lib/mock";

export const Route = createFileRoute("/admin/locais")({
  head: () => meta("Locais", "Cadastro de locais de operação e a câmera que registra cada leitura."),
  component: Locais,
});
type L = (typeof seed)[number];
const blank: L = { id: "", nome: "", descricao: "", camera: cameras[0]!.nome, gravador: gravadores[0]!.nome, dispositivos: 0, status: "ativo", ultima: NOW };

function Locais() {
  const [rows, setRows] = useState(seed);
  const [edit, setEdit] = useState<L | null>(null);
  const [toggle, setToggle] = useState<L | null>(null);
  const [view, setView] = useState<L | null>(null);
  const save = () => {
    if (!edit!.nome) { toast.error("Informe o nome do local"); return; }
    setRows(edit!.id ? rows.map((r) => (r.id === edit!.id ? edit! : r)) : [...rows, { ...edit!, id: crypto.randomUUID() }]);
    toast.success(edit!.id ? "Local atualizado" : "Local cadastrado");
    setEdit(null);
  };
  return (
    <>
      <PageHeader title="Locais" crumbs={["Locais"]} actions={<Button onClick={() => setEdit(blank)}><Plus className="h-4 w-4" />Novo local</Button>} />
      <p className="mb-4 text-sm text-muted-foreground">Cada local tem uma câmera principal: toda leitura feita nele é vinculada a essa câmera e ao gravador.</p>
      <Card>
        <Table head={<><Th>Nome do local</Th><Th>Descrição</Th><Th>Câmera</Th><Th>Gravador</Th><Th>Dispositivos</Th><Th>Status</Th><Th>Última atividade</Th><Th className="text-right">Ações</Th></>}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <Td className="font-medium">{r.nome}</Td><Td className="text-muted-foreground">{r.descricao}</Td><Td>{r.camera}</Td><Td>{r.gravador}</Td><Td>{r.dispositivos}</Td>
              <Td><StatusBadge status={r.status} /></Td><Td>{fmt(r.ultima)}</Td>
              <Td className="text-right">
                <Button size="icon" variant="ghost" aria-label="Ver detalhes" onClick={() => setView(r)}><Eye className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Ativar/desativar" onClick={() => setToggle(r)}><Power className="h-4 w-4" /></Button>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      {edit && (
        <FormDialog open onOpenChange={() => setEdit(null)} title={edit.id ? "Editar local" : "Novo local"} onSave={save}>
          <Field label="Nome" className="sm:col-span-2"><Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
          <Field label="Descrição" className="sm:col-span-2"><Textarea value={edit.descricao} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></Field>
          <Field label="Câmera principal"><Select value={edit.camera} onChange={(v) => setEdit({ ...edit, camera: v })} options={cameras.map((c) => c.nome)} /></Field>
          <Field label="Gravador relacionado"><Select value={edit.gravador} onChange={(v) => setEdit({ ...edit, gravador: v })} options={gravadores.map((g) => g.nome)} /></Field>
          <Field label="Status"><Select value={edit.status} onChange={(v) => setEdit({ ...edit, status: v as L["status"] })} options={["ativo", "inativo"]} /></Field>
        </FormDialog>
      )}
      <Confirm open={!!toggle} onOpenChange={() => setToggle(null)} title={toggle?.status === "ativo" ? "Desativar local?" : "Ativar local?"}
        description={`O local "${toggle?.nome}" ${toggle?.status === "ativo" ? "deixará de aparecer no coletor." : "voltará a ficar disponível no coletor."}`}
        onConfirm={() => { setRows(rows.map((r) => (r.id === toggle!.id ? { ...r, status: r.status === "ativo" ? "inativo" : "ativo" } : r))); toast.success("Status alterado"); }} />
      <Sheet open={!!view} onOpenChange={() => setView(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>{view?.nome}</SheetTitle></SheetHeader>
          {view && (
            <div className="space-y-4 px-4">
              <CameraFrame camera={view.camera} time={NOW} offline={view.gravador === "DVR-EXP-01"} />
              {[["Descrição", view.descricao], ["Câmera", view.camera], ["Gravador", view.gravador], ["Dispositivos", String(view.dispositivos)], ["Última atividade", fmt(view.ultima)]].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b pb-2 text-sm"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
