import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Check, Cpu } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge, meta } from "@/components/sl/ui";
import { useMobile } from "@/components/sl/mobile-state";
import { cameras, dispositivos, locais } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mobile/local")({
  head: () => meta("Coletor — Local", "Seleção do local de trabalho e do leitor no coletor Zebra."),
  component: MLocal,
});

function MLocal() {
  const m = useMobile();
  const nav = useNavigate();
  const ativos = locais.filter((l) => l.status === "ativo");
  return (
    <div className="space-y-5 p-4">
      <div><h1 className="text-xl font-semibold text-primary">Local de trabalho</h1><p className="text-sm text-muted-foreground">A câmera do local será vinculada a cada leitura.</p></div>
      <div className="space-y-2">
        {ativos.map((l) => {
          const cam = cameras.find((c) => c.nome === l.camera);
          const sel = m.local === l.nome;
          return (
            <button key={l.id} onClick={() => m.setLocal(l.nome)} className={cn("card-surface flex w-full items-center gap-3 p-4 text-left", sel && "border-brand ring-2 ring-brand")}>
              <div className="flex-1">
                <p className="font-semibold">{l.nome}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Camera className="h-3 w-3" />{l.camera}</p>
              </div>
              <StatusBadge status={cam?.status ?? "offline"} />
              {sel && <Check className="h-5 w-5 text-brand" />}
            </button>
          );
        })}
      </div>
      <div>
        <h2 className="mb-2 font-semibold text-primary">Leitor utilizado</h2>
        <div className="grid grid-cols-2 gap-2">
          {dispositivos.map((d) => (
            <button key={d.id} onClick={() => m.setLeitor(d.nome)} className={cn("card-surface p-3 text-left text-sm", m.leitor === d.nome && "border-brand ring-2 ring-brand")}>
              <Cpu className="mb-1 h-4 w-4 text-brand" /><p className="font-medium">{d.nome}</p><p className="font-mono text-xs text-muted-foreground">{d.codigo}</p>
            </button>
          ))}
        </div>
      </div>
      <Button className="h-14 w-full text-lg" disabled={!m.local || !m.leitor} onClick={() => { toast.success("Operação iniciada"); nav({ to: "/mobile/leitura" }); }}>Iniciar operação</Button>
    </div>
  );
}
