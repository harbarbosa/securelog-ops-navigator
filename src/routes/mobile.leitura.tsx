import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Confirm, meta } from "@/components/sl/ui";
import { useMobile } from "@/components/sl/mobile-state";
import { fmt } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mobile/leitura")({
  head: () => meta("Coletor — Leitura", "Tela de operação de leitura de códigos no coletor Zebra."),
  component: MLeitura,
});

function MLeitura() {
  const m = useMobile();
  const nav = useNavigate();
  const [flash, setFlash] = useState(false);
  const [fim, setFim] = useState(false);
  const last = m.sessao[0];
  const ler = () => {
    const c = `789${Math.floor(Math.random() * 1e10).toString().padStart(10, "0")}`;
    m.addLeitura(c);
    setFlash(true); setTimeout(() => setFlash(false), 400);
    m.online ? toast.success("Leitura registrada", { description: c }) : toast.warning("Salva no aparelho", { description: "Será enviada quando a conexão voltar." });
  };
  return (
    <div className="flex min-h-full flex-col gap-4 p-4">
      <div className="card-surface grid grid-cols-2 gap-2 p-3 text-xs">
        <div><p className="text-muted-foreground">Operador</p><p className="font-medium">{m.user}</p></div>
        <div><p className="text-muted-foreground">Status</p><p className={cn("font-semibold", m.online ? "text-success" : "text-destructive")}>{m.online ? "Online" : "Offline — salvando local"}</p></div>
        <div><p className="text-muted-foreground">Local</p><p className="font-medium">{m.local || "—"}</p></div>
        <div><p className="text-muted-foreground">Dispositivo</p><p className="font-medium">{m.leitor || "—"}</p></div>
      </div>
      <button onClick={ler} className={cn("relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-brand bg-brand-soft p-6 text-brand transition-colors", flash && "bg-success-soft border-success text-success")}>
        <span className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-transparent via-brand/10 to-transparent animate-scan" />
        <ScanLine className="mb-3 h-16 w-16" />
        <p className="text-lg font-semibold">Aponte o leitor para o código</p>
        <p className="text-sm opacity-80">ou toque para simular</p>
      </button>
      <div className="card-surface p-4">
        <p className="text-xs text-muted-foreground">Último código lido</p>
        <p className="font-mono text-2xl font-semibold text-primary">{last?.codigo ?? "—"}</p>
        <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">{last ? fmt(last.data) : "Nenhuma leitura ainda"}</span><span>Sessão: <b>{m.sessao.length}</b></span></div>
      </div>
      <Button className="h-14 text-lg" onClick={ler}><ScanLine className="h-5 w-5" />Simular leitura</Button>
      <Button variant="outline" className="h-12" onClick={() => setFim(true)}>Finalizar operação</Button>
      <Confirm open={fim} onOpenChange={setFim} title="Finalizar operação?" description={`${m.sessao.length} leituras nesta sessão. ${m.pend.length} pendentes continuarão aguardando sincronização.`} confirmLabel="Finalizar"
        onConfirm={() => { m.reset(); toast.success("Operação finalizada"); nav({ to: "/mobile/local" }); }} />
    </div>
  );
}
