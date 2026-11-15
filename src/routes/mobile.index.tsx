import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Logo, meta } from "@/components/sl/ui";
import { useMobile } from "@/components/sl/mobile-state";
import { securelog, setSecurelogApiBase } from "@/lib/securelog-api";
import { cacheUser, getCachedUser } from "@/lib/mobile-db";

export const Route = createFileRoute("/mobile/")({
  head: () => meta("Coletor — Entrar", "Login do operador no aplicativo SecureLog para coletor Zebra."),
  component: MLogin,
});

function MLogin() {
  const m = useMobile();
  const nav = useNavigate();
  const [pass, setPass] = useState("");
  const hostRef = useRef<HTMLInputElement>(null);
  const portRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!m.user || !pass) return setErr("Informe usuário e senha.");
    const serverHost=hostRef.current?.value.trim()??"";
    const serverPort=Number(portRef.current?.value??"");
    if(!serverHost||!Number.isInteger(serverPort)||serverPort<1||serverPort>65535)return setErr("Informe o endereço e a porta da API.");
    m.updateConfig({serverHost,serverPort});
    setSecurelogApiBase(`http://${serverHost}:${serverPort}`);
    if (!m.online || navigator.onLine === false) {
      const cached=await getCachedUser(m.user,pass).catch(()=>null);
      if(cached){m.setUser(cached.username);m.setRole(cached.role);nav({to:cached.role==="admin"?"/mobile/config":"/mobile/local"});}
      else setErr("Sem conexão e não há credenciais salvas para este usuário.");
      return;
    }
    setLoading(true);
    try {
      const response=await securelog.login(m.user,pass);
      await cacheUser(m.user,pass,response.user);
      m.setUser(response.user.username); m.setRole(response.user.role);
      nav({ to: response.user.role === "admin" ? "/mobile/config" : "/mobile/local" });
    } catch(error){
      const cached=await getCachedUser(m.user,pass).catch(()=>null);
      if(cached){m.setUser(cached.username);m.setRole(cached.role);m.setOnline(false);nav({to:cached.role==="admin"?"/mobile/config":"/mobile/local"});}
      else setErr(error instanceof Error?`${error.message} Não há credenciais salvas para acesso offline.`:"Usuário ou senha inválidos.");
    }
    finally { setLoading(false); }
  };
  const serverInputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className="flex min-h-full flex-col justify-center p-6">
      <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
      <div className="mx-auto mb-6 w-fit rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand">
        SecureLog Mobile · versão 1.0.2
      </div>
      <form onSubmit={go} className="space-y-4">
        <div className="grid grid-cols-[1fr_100px] gap-2"><Field label="Servidor da API"><input ref={hostRef} defaultValue={m.config.serverHost} type="text" inputMode="text" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="192.168.0.10" className={serverInputClass} /></Field><Field label="Porta"><input ref={portRef} defaultValue={m.config.serverPort} type="tel" inputMode="numeric" autoComplete="off" className={serverInputClass} /></Field></div>
        <Field label="Usuário"><Input className="h-14 text-lg" value={m.user} onChange={(e) => m.setUser(e.target.value)} /></Field>
        <Field label="Senha"><Input className="h-14 text-lg" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••" /></Field>
        {err && <div className="flex gap-2 rounded-md bg-danger-soft p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{err}</div>}
        <Button type="submit" className="h-14 w-full text-lg" disabled={loading}>{loading && <Loader2 className="h-5 w-5 animate-spin" />}Entrar</Button>
      </form>
      <p className={`mt-6 flex items-center justify-center gap-2 text-sm ${m.online ? "text-success" : "text-destructive"}`}>
        {m.online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}{m.online ? "Conectado ao servidor" : "Sem conexão com o servidor"}
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">O indicador mostra o estado de conectividade desta interface.</p>
    </div>
  );
}
