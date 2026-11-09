import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, Confirm, Field, PageHeader, meta } from "@/components/sl/ui";
import { NOW, ago, fmt } from "@/lib/mock";

export const Route = createFileRoute("/admin/retencao")({
  head: () => meta("Retenção de mídia", "Configuração de dias de retenção e limpeza de imagens e vídeos baixados."),
  component: Retencao,
});

function Retencao() {
  const [dias, setDias] = useState(7);
  const [confirm, setConfirm] = useState(false);
  const [running, setRunning] = useState(false);
  const [st, setSt] = useState({ usado: 38.4, temp: 1243, ultima: ago(60 * 11), removidos: 412, liberado: 6.2 });
  const run = () => {
    setRunning(true);
    setTimeout(() => { setRunning(false); setSt({ usado: 31.1, temp: 0, ultima: NOW, removidos: 1243, liberado: 7.3 }); toast.success("Limpeza concluída", { description: "1.243 arquivos removidos • 7,3 GB liberados" }); }, 1800);
  };
  const info = [
    ["Arquivos temporários", st.temp.toLocaleString("pt-BR")], ["Última limpeza", fmt(st.ultima)],
    ["Próxima limpeza", fmt(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1, 2, 0, 0))],
    ["Arquivos removidos (última)", st.removidos.toLocaleString("pt-BR")], ["Espaço liberado (última)", `${st.liberado.toLocaleString("pt-BR")} GB`],
  ];
  return (
    <>
      <PageHeader title="Retenção de mídia" crumbs={["Configurações", "Retenção de mídia"]} actions={
        <Button variant="destructive" onClick={() => setConfirm(true)} disabled={running}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Executar limpeza agora</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Política de retenção">
          <div className="space-y-4 p-5">
            <Field label="Dias de retenção"><Input type="number" min={1} max={90} value={dias} onChange={(e) => setDias(Number(e.target.value))} className="w-32" /></Field>
            <p className="text-sm text-muted-foreground">Imagens e trechos de vídeo baixados do gravador são removidos após {dias} dias. As gravações originais no NVR/DVR não são afetadas.</p>
            <Button onClick={() => toast.success("Configuração salva", { description: `Retenção definida em ${dias} dias` })}><Save className="h-4 w-4" />Salvar</Button>
          </div>
        </Card>
        <Card title="Armazenamento">
          <div className="space-y-4 p-5">
            <div><div className="mb-1 flex justify-between text-sm"><span>Espaço utilizado</span><span className="font-medium">{st.usado.toLocaleString("pt-BR")} GB de 100 GB</span></div><Progress value={st.usado} /></div>
            <dl className="divide-y">{info.map(([k, v]) => <div key={k} className="flex justify-between py-2 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
          </div>
        </Card>
      </div>
      <Confirm open={confirm} onOpenChange={setConfirm} title="Executar limpeza agora?" description={`Serão removidos os arquivos com mais de ${dias} dias e todos os arquivos temporários. Esta ação não pode ser desfeita.`} confirmLabel="Executar limpeza" onConfirm={run} />
    </>
  );
}
