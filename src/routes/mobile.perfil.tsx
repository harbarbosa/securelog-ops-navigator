import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confirm, meta } from "@/components/sl/ui";
import { useMobile } from "@/components/sl/mobile-state";
import { fmt } from "@/lib/mock";

export const Route = createFileRoute("/mobile/perfil")({
  head: () => meta("Coletor — Sessão", "Perfil do operador e dados da sessão no coletor Zebra."),
  component: MPerfil,
});

function MPerfil() {
  const m = useMobile();
  const nav = useNavigate();
  const [sair, setSair] = useState(false);
  const rows = [["Usuário", m.user], ["Local selecionado", m.local || "—"], ["Leitor utilizado", m.leitor || "—"], ["Última sincronização", fmt(m.ultimaSync)], ["Versão do aplicativo", "SecureLog Coletor 1.4.2 (build 142)"]];
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-lg font-semibold text-brand">{m.user.slice(0, 2).toUpperCase()}</div>
        <div><p className="font-semibold text-primary">{m.user}</p><p className="text-sm text-muted-foreground">Operador</p></div>
      </div>
      <dl className="card-surface divide-y">
        {rows.map(([k, v]) => <div key={k} className="px-4 py-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}
      </dl>
      <Button variant="outline" className="h-14 w-full text-lg" onClick={() => { m.reset(); nav({ to: "/mobile/local" }); }}><MapPin className="h-5 w-5" />Trocar local</Button>
      <Button variant="destructive" className="h-14 w-full text-lg" onClick={() => setSair(true)}><LogOut className="h-5 w-5" />Sair</Button>
      <Confirm open={sair} onOpenChange={setSair} title="Sair do aplicativo?" description={m.pend.length ? `Há ${m.pend.length} leituras pendentes. Elas ficam salvas no aparelho.` : "Sua sessão será encerrada."} confirmLabel="Sair"
        onConfirm={() => { m.reset(); nav({ to: "/mobile" }); }} />
    </div>
  );
}
