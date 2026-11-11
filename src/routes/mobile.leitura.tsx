import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, ScanLine, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { meta } from "@/components/sl/ui";
import { useMobile } from "@/components/sl/mobile-state";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mobile/leitura")({
  head: () => meta("Coletor — Leitura", "Tela de operação de leitura de códigos no coletor Zebra."),
  component: MLeitura,
});

function MLeitura() {
  const m = useMobile();
  const nav = useNavigate();
  const [flash, setFlash] = useState(false);
  const [code, setCode] = useState("");
  const last = m.sessao[0];
  const ler = async () => {
    if (!code.trim()) { toast.error("Informe ou leia um código"); return; }
    await m.recordReading(code);
    setCode(""); setFlash(true); window.setTimeout(() => setFlash(false), 500);
  };
  return (
    <div className="flex min-h-full flex-col gap-4 p-4">
      <div className="card-surface grid grid-cols-2 gap-2 p-3 text-xs">
        <div><p className="text-muted-foreground">Operador</p><p className="font-medium">{m.user}</p></div>
        <div><p className="text-muted-foreground">Status</p><p className={cn("font-semibold", m.online ? "text-success" : "text-destructive")}>{m.online ? "Online" : "Offline — salvando local"}</p></div>
        <div><p className="text-muted-foreground">Local</p><p className="font-medium">{m.local || "—"}</p></div>
        <div><p className="text-muted-foreground">Dispositivo</p><p className="font-medium">{m.leitor || "—"}</p></div>
      </div>
      {!m.online && <div className="flex items-center gap-2 rounded-md bg-danger-soft p-3 text-sm font-medium text-destructive"><WifiOff className="h-4 w-4"/>Sem comunicação: as leituras continuam no cache local.</div>}
      {m.online && m.pend.length > 0 && <div className="rounded-md bg-brand-soft p-3 text-sm font-medium text-brand">Conexão restaurada. Sincronizando {m.pend.length} leitura(s)…</div>}
      <button onClick={ler} className={cn("relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-brand bg-brand-soft p-6 text-brand transition-colors", flash && "bg-success-soft border-success text-success")}>
        <span className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-transparent via-brand/10 to-transparent animate-scan" />
        <ScanLine className="mb-3 h-16 w-16" />
        <p className="text-lg font-semibold">Aponte o leitor para o código</p>
        <p className="text-sm opacity-80">Use o leitor Zebra ou informe o código abaixo</p>
      </button>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void ler(); }}><Input autoFocus value={code} onChange={e => setCode(e.target.value)} placeholder="Código lido" className="h-12 font-mono"/><Button type="submit" className="h-12"><ScanLine className="h-4 w-4"/>Registrar</Button></form>
      <div className="card-surface p-4">
        <p className="text-xs text-muted-foreground">Último código lido</p>
        <p className="font-mono text-2xl font-semibold text-primary">{last?.codigo ?? "—"}</p>
        <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">{last ? fmt(last.data) : "Nenhuma leitura ainda"}</span><span>Sessão: <b>{m.sessao.length}</b></span></div>
      </div>
      <Button variant="destructive" className="h-12" onClick={() => { m.logout(); nav({ to: "/mobile" }); }}><LogOut className="h-5 w-5" />Sair para outro usuário</Button>
    </div>
  );
}
