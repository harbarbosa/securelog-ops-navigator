import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, Field, PageHeader, Select, StatusBadge, Table, Td, Th, meta } from "@/components/sl/ui";
import { FormDialog } from "@/components/sl/crud";
import { NOW, fmt, locais, usuarios as seed } from "@/lib/mock";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => meta("Usuários", "Gerenciamento de usuários, perfis e permissões do SecureLog."),
  component: Usuarios,
});
type U = (typeof seed)[number];
const blank: U = { id: "", nome: "", usuario: "", perfil: "Operador", locais: [], ultimo: NOW, status: "ativo", video: false, admin: false };

function Usuarios() {
  const [rows, setRows] = useState(seed);
  const [edit, setEdit] = useState<U | null>(null);
  const save = () => {
    if (!edit!.nome || !edit!.usuario) { toast.error("Preencha nome e usuário"); return; }
    setRows(edit!.id ? rows.map((r) => (r.id === edit!.id ? edit! : r)) : [...rows, { ...edit!, id: crypto.randomUUID() }]);
    toast.success("Usuário salvo"); setEdit(null);
  };
  return (
    <>
      <PageHeader title="Usuários" crumbs={["Usuários"]} actions={<Button onClick={() => setEdit(blank)}><Plus className="h-4 w-4" />Novo usuário</Button>} />
      <Card>
        <Table head={<><Th>Nome</Th><Th>Usuário</Th><Th>Perfil</Th><Th>Locais permitidos</Th><Th>Último acesso</Th><Th>Status</Th><Th /></>}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <Td className="font-medium">{r.nome}</Td><Td className="font-mono text-xs">{r.usuario}</Td>
              <Td><span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">{r.perfil}</span></Td>
              <Td className="max-w-xs truncate">{r.locais.join(", ") || "—"}</Td><Td>{fmt(r.ultimo)}</Td><Td><StatusBadge status={r.status} /></Td>
              <Td><Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></Button></Td>
            </tr>
          ))}
        </Table>
      </Card>
      {edit && (
        <FormDialog open onOpenChange={() => setEdit(null)} title={edit.id ? "Editar usuário" : "Novo usuário"} onSave={save}>
          <Field label="Nome"><Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
          <Field label="E-mail ou usuário"><Input value={edit.usuario} onChange={(e) => setEdit({ ...edit, usuario: e.target.value })} /></Field>
          <Field label="Perfil"><Select value={edit.perfil} onChange={(v) => setEdit({ ...edit, perfil: v })} options={["Administrador", "Supervisor", "Operador", "Consulta"]} /></Field>
          <Field label="Status"><Select value={edit.status} onChange={(v) => setEdit({ ...edit, status: v as U["status"] })} options={["ativo", "inativo"]} /></Field>
          <Field label="Locais permitidos" className="sm:col-span-2">
            <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
              {locais.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={edit.locais.includes(l.nome)} onCheckedChange={(c) => setEdit({ ...edit, locais: c ? [...edit.locais, l.nome] : edit.locais.filter((x) => x !== l.nome) })} />{l.nome}
                </label>
              ))}
            </div>
          </Field>
          <label className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm sm:col-span-2">Permissão para consultar vídeos<Switch checked={edit.video} onCheckedChange={(v) => setEdit({ ...edit, video: v })} /></label>
          <label className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm sm:col-span-2">Permissão para administrar cadastros<Switch checked={edit.admin} onCheckedChange={(v) => setEdit({ ...edit, admin: v })} /></label>
        </FormDialog>
      )}
    </>
  );
}
