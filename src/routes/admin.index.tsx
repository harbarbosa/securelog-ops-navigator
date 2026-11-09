import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Barcode, Camera, CheckCircle2, Clock, Cpu, Database, HardDrive, RefreshCw, ScanLine, Server, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, StatusBadge, Table, Td, Th, meta } from "@/components/sl/ui";
import { alertas, ago, fmt, leituras } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => meta("Visão geral", "Indicadores de leituras, dispositivos, câmeras e gravadores em tempo real."),
  component: Overview,
});

const stats = [
  { label: "Leituras hoje", value: "1.284", sub: "+12% vs. ontem", icon: ScanLine },
  { label: "Códigos únicos", value: "1.137", sub: "88,5% do total", icon: Barcode },
  { label: "Dispositivos ativos", value: "4 / 5", sub: "1 offline", icon: Cpu, warn: true },
  { label: "Câmeras conectadas", value: "5 / 6", sub: "CAM-EXP-03 sem sinal", icon: Camera, warn: true },
  { label: "Gravadores online", value: "2 / 3", sub: "DVR-EXP-01 offline", icon: HardDrive, warn: true },
  { label: "Pendentes de sincronização", value: "28", sub: "em 3 leitores", icon: RefreshCw, warn: true },
];

function Overview() {
  const ops = [
    { label: "Servidor", value: "Online", ok: true, icon: Server },
    { label: "Banco de dados", value: "Online", ok: true, icon: Database },
    { label: "Leitores conectados", value: "4 de 5", ok: false, icon: Wifi },
    { label: "Gravadores conectados", value: "2 de 3", ok: false, icon: HardDrive },
    { label: "Último heartbeat enviado", value: fmt(ago(0.5)), ok: true, icon: CheckCircle2 },
    { label: "Próxima verificação prevista", value: fmt(new Date(ago(0).getTime() + 4.5 * 60000)), ok: true, icon: Clock },
  ];
  return (
    <>
      <PageHeader title="Visão geral" crumbs={["Visão geral"]} actions={<span className="text-xs text-muted-foreground">Atualizado em {fmt(ago(0))}</span>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card-surface p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-soft text-brand"><s.icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-primary">{s.value}</p>
            <p className={cn("text-xs", s.warn ? "text-warning" : "text-success")}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Status operacional" className="xl:col-span-2">
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {ops.map((o) => (
              <div key={o.label} className="flex items-center gap-3 bg-card p-4">
                <span className={cn("grid h-9 w-9 place-items-center rounded-md", o.ok ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}><o.icon className="h-4 w-4" /></span>
                <div><p className="text-xs text-muted-foreground">{o.label}</p><p className="text-sm font-medium">{o.value}</p></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Alertas recentes" action={<Link to="/admin/monitoramento" className="text-xs text-brand hover:underline">Ver monitoramento</Link>}>
          <ul className="divide-y">
            {alertas.map((a) => (
              <li key={a.id} className="flex gap-3 px-5 py-3">
                <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", a.nivel === "erro" ? "text-destructive" : "text-warning")} />
                <div><p className="text-sm font-medium">{a.tipo}</p><p className="text-xs text-muted-foreground">{a.texto}</p><p className="font-mono text-[11px] text-muted-foreground">{fmt(a.data)}</p></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Últimas leituras" className="mt-6" action={<Link to="/admin/leituras" className="text-xs text-brand hover:underline">Ver todas</Link>}>
        <Table head={<><Th>Código</Th><Th>Data e hora</Th><Th>Usuário</Th><Th>Local</Th><Th>Dispositivo</Th><Th>Câmera</Th><Th>Status</Th><Th /></>}>
          {leituras.slice(0, 8).map((l) => (
            <tr key={l.id} className="hover:bg-muted/40">
              <Td className="font-mono">{l.codigo}</Td><Td>{fmt(l.data)}</Td><Td>{l.usuario}</Td><Td>{l.local}</Td><Td>{l.dispositivo}</Td><Td>{l.camera}</Td>
              <Td><StatusBadge status={l.status} /></Td>
              <Td><Button asChild size="sm" variant="outline"><Link to="/admin/leituras/$id" params={{ id: l.id }}>Consultar</Link></Button></Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
