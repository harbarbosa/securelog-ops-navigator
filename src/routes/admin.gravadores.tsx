import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Pencil, Plug, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Field, PageHeader, Select, StatusBadge, Table, Td, Th, meta } from "@/components/sl/ui";
import { FormDialog } from "@/components/sl/crud";
import { NOW, fmt, gravadores as seed } from "@/lib/mock";

export const Route = createFileRoute("/admin/gravadores")({
  head: () => meta("Gravadores", "Cadastro de gravadores NVR/DVR e teste de conexão."),
  component: Gravadores,
});
type G = (typeof seed)[number];
const blank: G = { id: "", nome: "", endereco: "", porta: 8000, usuario: "", modelo: "—", tipo: "NVR", cameras: 0, status: "online", ultima: NOW };
const results = [
  { s: "online" as const, t: "Conectado", d: "Gravador respondeu em 84 ms." },
  { s: "erro" as const, t: "Falha de autenticação", d: "Usuário ou senha recusados pelo gravador." },
  { s: "offline" as const, t: "Sem comunicação", d: "Tempo limite excedido ao acessar o endereço." },
];

function Gravadores() {
  const [rows, setRows] = useState(seed);
  const [edit, setEdit] = useState<G | null>(null);
  const [testing, setTesting] = useState(false);
  const [res, setRes] = useState<(typeof results)[number] | null>(null);
  const [n, setN] = useState(0);
  const test = () => {
    setTesting(true); setRes(null);
    setTimeout(() => { const r = results[n % 3]!; setN(n + 1); setTesting(false); setRes(r); r.s === "online" ? toast.success(r.t) : toast.error(r.t, { description: r.d }); }, 1200);
  };
  const save = () => {
    if (!edit!.nome || !edit!.endereco) { toast.error("Preencha nome e endereço"); return; }
    setRows(edit!.id ? rows.map((r) => (r.id === edit!.id ? edit! : r)) : [...rows, { ...edit!, id: crypto.randomUUID() }]);
    toast.success("Gravador salvo"); setEdit(null);
  };
  const open = (g: G) => { setRes(null); setEdit(g); };
  return (
    <>
      <PageHeader title="Gravadores" crumbs={["Configurações", "Gravadores"]} actions={<Button onClick={() => open(blank)}><Plus className="h-4 w-4" />Novo gravador</Button>} />
      <Card>
        <Table head={<><Th>Nome</Th><Th>Endereço</Th><Th>Modelo</Th><Th>Câmeras</Th><Th>Status da conexão</Th><Th>Última comunicação</Th><Th /></>}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <Td className="font-medium">{r.nome}</Td><Td className="font-mono text-xs">{r.endereco}:{r.porta}</Td><Td>{r.modelo}</Td><Td>{r.cameras}</Td>
              <Td><StatusBadge status={r.status} /></Td><Td>{fmt(r.ultima)}</Td>
              <Td><Button size="icon" variant="ghost" aria-label="Editar" onClick={() => open(r)}><Pencil className="h-4 w-4" /></Button></Td>
            </tr>
          ))}
        </Table>
      </Card>
      {edit && (
        <FormDialog open onOpenChange={() => setEdit(null)} title={edit.id ? "Editar gravador" : "Novo gravador"} onSave={save}
          extra={<Button type="button" variant="outline" onClick={test} disabled={testing}>{testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}Testar conexão</Button>}>
          <Field label="Nome"><Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
          <Field label="Tipo de gravador"><Select value={edit.tipo} onChange={(v) => setEdit({ ...edit, tipo: v })} options={["NVR", "DVR", "Híbrido"]} /></Field>
          <Field label="Endereço interno"><Input value={edit.endereco} onChange={(e) => setEdit({ ...edit, endereco: e.target.value })} placeholder="10.20.1.10" /></Field>
          <Field label="Porta"><Input type="number" value={edit.porta} onChange={(e) => setEdit({ ...edit, porta: Number(e.target.value) })} /></Field>
          <Field label="Usuário"><Input value={edit.usuario} onChange={(e) => setEdit({ ...edit, usuario: e.target.value })} /></Field>
          <Field label="Senha"><Input type="password" defaultValue="********" /></Field>
          <Field label="Status"><Select value={edit.status} onChange={(v) => setEdit({ ...edit, status: v as G["status"] })} options={["online", "offline", "inativo"]} /></Field>
          {res && <div className="flex items-center gap-2 rounded-md border p-3 text-sm sm:col-span-2"><StatusBadge status={res.s} label={res.t} /><span className="text-muted-foreground">{res.d}</span></div>}
        </FormDialog>
      )}
    </>
  );
}
