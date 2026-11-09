import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Logo, meta } from "@/components/sl/ui";
import bg from "@/assets/login-bg.jpg";
import { securelog } from "@/lib/securelog-api";

export const Route = createFileRoute("/")({
  head: () => meta("Entrar", "Acesso ao painel administrativo SecureLog de leituras, câmeras e gravadores."),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!user || !pass) return setErr("Informe usuário e senha.");
    setLoading(true);
    try {
      const response = await securelog.login(user, pass);
      toast.success(`Bem-vindo, ${response.user.name}`);
      nav({ to: "/admin" });
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-sidebar px-4 py-10">
      <img src={bg} alt="" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover opacity-60" />
      <div className="relative w-full max-w-sm">
        <div className="card-surface p-8">
          <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
          <h1 className="text-center text-lg font-semibold text-primary">Acesso ao painel</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">Rastreabilidade de leituras e mídias</p>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Usuário ou e-mail"><Input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" /></Field>
            <Field label="Senha"><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></Field>
            {err && (
              <div className="flex gap-2 rounded-md bg-danger-soft p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{err}</div>
            )}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2"><Checkbox defaultChecked />Lembrar acesso</label>
              <button type="button" className="text-brand hover:underline" onClick={() => toast.info("Recuperação de senha ainda não disponível. Contate o administrador.")}>
                Esqueci minha senha
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}Entrar</Button>
          </form>

        </div>
        <Link to="/mobile" className="mt-4 flex items-center justify-center gap-2 text-sm text-sidebar-accent-foreground hover:underline">
          <Smartphone className="h-4 w-4" />Abrir aplicativo do coletor Zebra
        </Link>
      </div>
    </div>
  );
}
