import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge, meta } from "@/components/sl/ui";
import { useMobile } from "@/components/sl/mobile-state";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/mobile/pendentes")({
  head: () => meta("Coletor — Pendentes", "Leituras salvas no coletor aguardando sincronização."),
  component: MPend,
});

function MPend() {
  const m = useMobile();
  const sync = () => { if (!m.online) { toast.error("Sem conexão", { description: "Conecte-se à rede para sincronizar." }); return; } void m.sync(); };
  const banner = !m.online ? { i: <WifiOff className="h-5 w-5" />, t: "Sem conexão — leituras ficam salvas no aparelho", c: "bg-danger-soft text-destructive" }
    : m.pend.length === 0 ? { i: <CheckCircle2 className="h-5 w-5" />, t: "Nenhuma leitura pendente", c: "bg-success-soft text-success" } : { i: <RefreshCw className="h-5 w-5" />, t: "Leituras aguardando sincronização", c: "bg-brand-soft text-brand" };
  return (
    <div className="space-y-4 p-4">
      <div className="card-surface flex items-center justify-between p-4">
        <div><p className="text-sm text-muted-foreground">Leituras pendentes</p><p className="text-4xl font-semibold text-primary">{m.pend.length}</p></div>
        <RefreshCw className="h-10 w-10 text-brand opacity-30" />
      </div>
      {banner && <div className={`flex items-center gap-2 rounded-md p-3 text-sm font-medium ${banner.c}`}>{banner.i}{banner.t}</div>}
      <ul className="space-y-2">
        {m.pend.map((p) => (
          <li key={p.id} className="card-surface p-3">
            <div className="flex items-center justify-between"><span className="font-mono font-semibold">{p.codigo}</span><StatusBadge status={p.status === "erro" ? "erro" : "pendente"} label={p.status === "erro" ? "Erro" : "Aguardando"} /></div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{fmt(p.data)}</span><span>Tentativas: {p.tentativas}</span></div>
          </li>
        ))}
      </ul>
      <Button className="h-14 w-full text-lg" onClick={sync} disabled={m.pend.length === 0}><RefreshCw className="h-5 w-5" />Verificar sincronização</Button>
    </div>
  );
}
