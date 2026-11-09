import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Logo, meta } from "@/components/sl/ui";
import { useMobile } from "@/components/sl/mobile-state";

export const Route = createFileRoute("/mobile/")({
  head: () => meta("Coletor — Entrar", "Login do operador no aplicativo SecureLog para coletor Zebra."),
  component: MLogin,
});

function MLogin() {
  const m = useMobile();
  const nav = useNavigate();
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const go = (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!m.user || !pass) return setErr("Informe usuário e senha.");
    if (!m.online) return setErr("Sem conexão. O primeiro acesso do turno precisa de rede.");
    setLoading(true);
    setTimeout(() => { setLoading(false); if (pass === "erro") return setErr("Usuário ou senha inválidos."); nav({ to: "/mobile/local" }); }, 700);
  };
  return (
    <div className="flex min-h-full flex-col justify-center p-6">
      <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
      <form onSubmit={go} className="space-y-4">
        <Field label="Usuário"><Input className="h-14 text-lg" value={m.user} onChange={(e) => m.setUser(e.target.value)} /></Field>
        <Field label="Senha"><Input className="h-14 text-lg" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••" /></Field>
        {err && <div className="flex gap-2 rounded-md bg-danger-soft p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{err}</div>}
        <Button type="submit" className="h-14 w-full text-lg" disabled={loading}>{loading && <Loader2 className="h-5 w-5 animate-spin" />}Entrar</Button>
      </form>
      <p className={`mt-6 flex items-center justify-center gap-2 text-sm ${m.online ? "text-success" : "text-destructive"}`}>
        {m.online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}{m.online ? "Conectado ao servidor" : "Sem conexão com o servidor"}
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">Toque no indicador no topo para simular perda de rede.</p>
    </div>
  );
}
