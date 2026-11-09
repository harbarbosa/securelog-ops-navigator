import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppWindow, Camera, Code2, Cpu, Database, HardDrive, Server, Workflow } from "lucide-react";
import { Card, PageHeader, Select, StatusBadge, meta } from "@/components/sl/ui";
import { NOW, ago, eventos, fmt, type Status } from "@/lib/mock";

export const Route = createFileRoute("/admin/monitoramento")({
  head: () => meta("Monitoramento", "Saúde da aplicação, servidor, banco, leitores, gravadores e integrações."),
  component: Monitoramento,
});

const items: { nome: string; icon: typeof Server; status: Status; min: number; info: string }[] = [
  { nome: "Aplicação", icon: AppWindow, status: "online", min: 0.5, info: "v1.4.2 • 99,98% no mês" },
  { nome: "PHP", icon: Code2, status: "online", min: 0.5, info: "PHP 8.2 • 14 workers" },
  { nome: "MySQL", icon: Database, status: "online", min: 0.5, info: "Latência 3 ms" },
  { nome: "Servidor", icon: Server, status: "online", min: 0.5, info: "CPU 22% • RAM 61% • Disco 48%" },
  { nome: "Leitores", icon: Cpu, status: "pendente", min: 1, info: "4 de 5 conectados" },
  { nome: "Gravadores", icon: HardDrive, status: "offline", min: 47, info: "DVR-EXP-01 sem resposta" },
  { nome: "Câmeras", icon: Camera, status: "pendente", min: 1, info: "5 de 6 com sinal" },
  { nome: "Comunicação Alfredo/n8n", icon: Workflow, status: "online", min: 0.5, info: "Último heartbeat aceito" },
];
const since = (m: number) => (m < 1 ? `${Math.round(m * 60)} s` : `${Math.round(m)} min`);

function Monitoramento() {
  const [periodo, setPeriodo] = useState("Últimas 24 horas");
  const [status, setStatus] = useState("");
  const lim = periodo === "Última hora" ? 60 : periodo === "Últimas 6 horas" ? 360 : 1440;
  const evs = eventos.filter((e) => (NOW.getTime() - e.data.getTime()) / 60000 <= lim && (!status || e.status === status));
  return (
    <>
      <PageHeader title="Monitoramento" crumbs={["Configurações", "Monitoramento"]} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((i) => (
          <div key={i.nome} className="card-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-primary"><i.icon className="h-4 w-4 text-brand" />{i.nome}</span>
              <StatusBadge status={i.status} label={i.status === "pendente" ? "Atenção" : undefined} />
            </div>
            <p className="mb-3 text-xs text-muted-foreground">{i.info}</p>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt className="text-muted-foreground">Última verificação</dt><dd className="font-mono">{fmt(ago(0.5))}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Desde o último contato</dt><dd className="font-mono">{since(i.min)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Próxima verificação</dt><dd className="font-mono">{fmt(new Date(NOW.getTime() + 270000))}</dd></div>
            </dl>
          </div>
        ))}
      </div>
      <Card title="Histórico de eventos" className="mt-6" action={
        <div className="flex gap-2">
          <div className="w-44"><Select value={periodo} onChange={setPeriodo} options={["Última hora", "Últimas 6 horas", "Últimas 24 horas"]} /></div>
          <div className="w-36"><Select value={status} onChange={setStatus} placeholder="Todos status" options={["online", "offline", "falha", "pendente"]} /></div>
        </div>}>
        <ol className="space-y-5 p-6">
          {evs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento no período selecionado.</p>}
          {evs.map((e) => (
            <li key={e.id} className="relative flex gap-4 pl-6 before:absolute before:left-[5px] before:top-4 before:h-[calc(100%+0.75rem)] before:w-px before:bg-border last:before:hidden">
              <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-card bg-brand ring-1 ring-border" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{e.tipo}</p><StatusBadge status={e.status} /></div>
                <p className="text-xs text-muted-foreground">{e.origem}</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{fmt(e.data)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
