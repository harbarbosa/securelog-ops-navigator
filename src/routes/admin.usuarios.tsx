import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, Confirm, Field, PageHeader, StatusBadge, Table, Td, Th, meta } from "@/components/sl/ui";
import { api, securelog, type Page } from "@/lib/securelog-api";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/admin/usuarios")({ head: () => meta("Usuários", "Usuários reais cadastrados no SecureLog."), component: Usuarios });
type Role = "admin" | "supervisor" | "operator" | "viewer";
type User = { id: string; name: string; username: string; email: string | null; role: Role; active: boolean; created_at: string };
type Form = { id?: string; name: string; username: string; email: string; password: string; role: Role; active: boolean };
const empty: Form = { name: "", username: "", email: "", password: "", role: "operator", active: true };
const roleLabel: Record<Role, string> = { admin: "Administrador", supervisor: "Supervisor", operator: "Operador", viewer: "Consulta" };

function Usuarios() {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<Form | null>(null);
  const [remove, setRemove] = useState<User | null>(null);

  const load = () => {
    setLoading(true);
    return api<Page<User>>("/api/users?limit=100&offset=0").then((r) => setRows(r.items)).catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar usuários")).finally(() => setLoading(false));
  };
  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (!edit) return;
    if (!edit.name.trim() || !edit.username.trim()) { toast.error("Informe nome e usuário"); return; }
    if (!edit.id && edit.password.length < 12) { toast.error("A senha precisa ter pelo menos 12 caracteres"); return; }
    if (edit.id && edit.password && edit.password.length < 12) { toast.error("A nova senha precisa ter pelo menos 12 caracteres"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: edit.name.trim(), username: edit.username.trim(), email: edit.email.trim() || null, role: edit.role, active: edit.active };
      if (edit.password) body.password = edit.password;
      if (edit.id) await securelog.update("users", edit.id, body);
      else await securelog.create("users", { ...body, password: edit.password });
      toast.success(edit.id ? "Usuário atualizado" : "Usuário criado");
      setEdit(null);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao salvar usuário"); }
    finally { setSaving(false); }
  };

  const toggle = async (user: User) => {
    try { await securelog.update("users", user.id, { active: !user.active }); toast.success(user.active ? "Usuário desativado" : "Usuário ativado"); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao alterar status"); }
  };

  const confirmRemove = async () => {
    if (!remove) return;
    try { await securelog.delete("users", remove.id); toast.success("Usuário excluído"); setRemove(null); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao excluir usuário"); }
  };

  return <>
    <PageHeader title="Usuários" crumbs={["Usuários"]} actions={<Button onClick={() => setEdit({ ...empty })}><Plus className="h-4 w-4" />Adicionar usuário</Button>} />
    <Card><Table head={<><Th>Nome</Th><Th>Usuário</Th><Th>E-mail</Th><Th>Perfil</Th><Th>Cadastro</Th><Th>Status</Th><Th>Ações</Th></>}>
      {rows.map((r) => <tr key={r.id}><Td className="font-medium">{r.name}</Td><Td className="font-mono text-xs">{r.username}</Td><Td>{r.email ?? "—"}</Td><Td>{roleLabel[r.role]}</Td><Td>{fmt(r.created_at)}</Td><Td><StatusBadge status={r.active ? "ativo" : "inativo"} /></Td><Td><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="Editar usuário" onClick={() => setEdit({ id: r.id, name: r.name, username: r.username, email: r.email ?? "", password: "", role: r.role, active: r.active })}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={r.active ? "Desativar usuário" : "Ativar usuário"} onClick={() => void toggle(r)}><Power className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Excluir usuário" onClick={() => setRemove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></Td></tr>)}
    </Table>{loading && <p className="p-4 text-sm">Carregando usuários...</p>}{!loading && !rows.length && <p className="p-4 text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>}</Card>

    <Dialog open={Boolean(edit)} onOpenChange={(open) => { if (!open && !saving) setEdit(null); }}>
      <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{edit?.id ? "Editar usuário" : "Adicionar usuário"}</DialogTitle></DialogHeader>
        {edit && <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field><Field label="Usuário"><Input value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value })} autoComplete="username" /></Field><Field label="E-mail"><Input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field><Field label="Perfil"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>{Object.entries(roleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label={edit.id ? "Nova senha (opcional)" : "Senha (mínimo 12 caracteres)"}><Input type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} autoComplete="new-password" /></Field><label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Usuário ativo</label></div>}
        <DialogFooter><Button variant="outline" onClick={() => setEdit(null)} disabled={saving}>Cancelar</Button><Button onClick={() => void submit()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Confirm open={Boolean(remove)} onOpenChange={(open) => { if (!open) setRemove(null); }} title="Excluir usuário?" description={`O usuário ${remove?.name ?? "selecionado"} será removido definitivamente.`} confirmLabel="Excluir" onConfirm={() => void confirmRemove()} />
  </>;
}
