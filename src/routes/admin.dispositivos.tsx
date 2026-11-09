import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Field, PageHeader, Select, StatusBadge, Table, Td, Th, meta } from "@/components/sl/ui";
import { FormDialog } from "@/components/sl/crud";
import { NOW, dispositivos as seed, fmt, locais, usuarios } from "@/lib/mock";

export const Route = createFileRoute("/admin/dispositivos")({
  head: () => meta("Dispositivos", "Cadastro dos leitores Zebra, status de comunicação e pendências."),
  component: Dispositivos,
});
type D = (typeof seed)[number];
const blank: D = { id: "", nome: "", codigo: "", serie: "", local: locais[0]!.nome, usuario: "—", ultima: NOW, pendentes: 0, status: "online" };
const label: Record<string, string> = { pendente: "Com pendências" };

function Dispositivos() {
  const [rows, setRows] = useState(seed);
  const [edit, setEdit] = useState<D | null>(null);
  const save = () => {
    if (!edit!.nome || !edit!.codigo) { toast.error("Preencha nome e código"); return; }
    setRows(edit!.id ? rows.map((r) => (r.id === edit!.id ? edit! : r)) : [...rows, { ...edit!, id: crypto.randomUUID() }]);
    toast.success("Dispositivo salvo"); setEdit(null);
  };
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  return (
    <>
      <PageHeader title="Dispositivos e leitores" crumbs={["Configurações", "Dispositivos"]} actions={<Button onClick={() => setEdit(blank)}><Plus className="h-4 w-4" />Novo leitor</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {(["online", "offline", "sincronizando", "pendente"] as const).map((s) => (
          <div key={s} className="card-surface flex items-center justify-between p-4"><StatusBadge status={s} label={label[s]} /><span className="text-2xl font-semibold text-primary">{count(s)}</span></div>
        ))}
      </div>
      <Card>
        <Table head={<><Th>Nome do leitor</Th><Th>Código / série</Th><Th>Local atual</Th><Th>Usuário vinculado</Th><Th>Última comunicação</Th><Th>Pendentes</Th><Th>Status</Th><Th /></>}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <Td className="font-medium">{r.nome}</Td><Td className="font-mono text-xs">{r.codigo}<br /><span className="text-muted-foreground">{r.serie}</span></Td>
              <Td>{r.local}</Td><Td>{r.usuario}</Td><Td>{fmt(r.ultima)}</Td><Td className={r.pendentes ? "font-semibold text-warning" : ""}>{r.pendentes}</Td>
              <Td><StatusBadge status={r.status} label={label[r.status]} /></Td>
              <Td><Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></Button></Td>
            </tr>
          ))}
        </Table>
      </Card>
      {edit && (
        <FormDialog open onOpenChange={() => setEdit(null)} title={edit.id ? "Editar leitor" : "Novo leitor"} onSave={save}>
          <Field label="Nome"><Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
          <Field label="Código do dispositivo"><Input value={edit.codigo} onChange={(e) => setEdit({ ...edit, codigo: e.target.value })} /></Field>
          <Field label="Número de série"><Input value={edit.serie} onChange={(e) => setEdit({ ...edit, serie: e.target.value })} /></Field>
          <Field label="Local permitido"><Select value={edit.local} onChange={(v) => setEdit({ ...edit, local: v })} options={locais.map((l) => l.nome)} /></Field>
          <Field label="Usuário responsável"><Select value={edit.usuario} onChange={(v) => setEdit({ ...edit, usuario: v })} options={["—", ...usuarios.map((u) => u.nome)]} /></Field>
          <Field label="Status"><Select value={edit.status} onChange={(v) => setEdit({ ...edit, status: v as D["status"] })} options={["online", "offline", "sincronizando", "pendente", "inativo"]} /></Field>
        </FormDialog>
      )}
    </>
  );
}
