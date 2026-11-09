import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, WifiOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge, meta } from "@/components/sl/ui";
import { useMobile } from "@/components/sl/mobile-state";
import { fmt } from "@/lib/mock";

export const Route = createFileRoute("/mobile/pendentes")({
  head: () => meta("Coletor — Pendentes", "Leituras salvas no coletor aguardando sincronização."),
  component: MPend,
});

function MPend() {
  const m = useMobile();
  const [syncing, setSyncing] = useState(false);
  const [erro, setErro] = useState(false);
  const [n, setN] = useState(0);
  const sync = () => {
    setErro(false);
    if (!m.online) { toast.error("Sem conexão", { description: "Conecte-se à rede para sincronizar." }); return; }
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false); setN(n + 1);
      if (n === 0 && m.pend.some((p) => p.status === "erro")) {
        setErro(true); m.setPend(m.pend.map((p) => ({ ...p, tentativas: p.tentativas + 1, status: "erro" })));
        { toast.error("Erro ao sincronizar", { description: "Servidor não respondeu. Tente novamente." }); return; }
      }
      toast.success(`${m.pend.length} leituras sincronizadas`); m.setPend([]); m.setUltimaSync(new Date());
    }, 1500);
  };
  const banner = syncing ? { i: <Loader2 className="h-5 w-5 animate-spin" />, t: "Sincronização em andamento…", c: "bg-brand-soft text-brand" }
    : !m.online ? { i: <WifiOff className="h-5 w-5" />, t: "Sem conexão — leituras ficam salvas no aparelho", c: "bg-danger-soft text-destructive" }
    : erro ? { i: <AlertTriangle className="h-5 w-5" />, t: "Erro ao sincronizar. Tente novamente.", c: "bg-danger-soft text-destructive" }
    : m.pend.length === 0 ? { i: <CheckCircle2 className="h-5 w-5" />, t: "Tudo sincronizado", c: "bg-success-soft text-success" } : null;
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
            <div className="flex items-center justify-between"><span className="font-mono font-semibold">{p.codigo}</span><StatusBadge status={syncing ? "sincronizando" : p.status === "erro" ? "erro" : "pendente"} label={syncing ? "Enviando" : p.status === "erro" ? "Erro" : "Aguardando"} /></div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{fmt(p.data)}</span><span>Tentativas: {p.tentativas}</span></div>
          </li>
        ))}
      </ul>
      <Button className="h-14 w-full text-lg" onClick={sync} disabled={syncing || m.pend.length === 0}>{syncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}Sincronizar agora</Button>
    </div>
  );
}
