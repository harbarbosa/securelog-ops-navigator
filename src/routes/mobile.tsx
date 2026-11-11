import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, CloudUpload, ScanLine, User, Wifi, WifiOff } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { MobileProvider, useMobile } from "@/components/sl/mobile-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mobile")({ component: MobileLayout });

function MobileLayout() {
  return (
    <MobileProvider>
      <MobileShell />
    </MobileProvider>
  );
}

function MobileShell() {
  const m = useMobile();
  const nav = useNavigate();
  useEffect(() => {
    if (m.role !== "operator" || !m.user) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => { m.logout(); toast.info("Sessão encerrada por 5 minutos de inatividade"); nav({ to: "/mobile" }); }, 5 * 60 * 1000); };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach(event => window.addEventListener(event, reset));
    reset();
    return () => { clearTimeout(timer); events.forEach(event => window.removeEventListener(event, reset)); };
  }, [m.role, m.user, m.logout, nav]);
  return (
      <div className="min-h-screen bg-sidebar sm:grid sm:place-items-center sm:py-8">
        <div className="mx-auto flex h-screen w-full max-w-[400px] flex-col overflow-hidden bg-background sm:h-[780px] sm:rounded-[2rem] sm:border-8 sm:border-media sm:shadow-2xl">
          <StatusBar />
          <div className="flex-1 overflow-y-auto"><Outlet /></div>
          <TabBar />
        </div>
        <Link to="/admin" className="mt-4 hidden items-center gap-2 text-sm text-sidebar-foreground hover:underline sm:flex"><ArrowLeft className="h-4 w-4" />Painel administrativo</Link>
      </div>
  );
}

function StatusBar() {
  const m = useMobile();
  return (
    <div className="flex items-center justify-between bg-primary px-4 py-1.5 text-xs text-primary-foreground">
      <span>{m.config.deviceName || "Zebra TC21"}</span>
      <button onClick={() => m.setOnline(!m.online)} className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", m.online ? "bg-success" : "bg-destructive")} title="Alternar conexão (simulação)">
        {m.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{m.online ? "Online" : "Offline"}
      </button>
    </div>
  );
}

function TabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const m = useMobile();
  if (!m.leitor || path === "/mobile" || path === "/mobile/" || path.startsWith("/mobile/local")) return null;
  const tabs = [
    { to: "/mobile/leitura", label: "Leitura", icon: ScanLine },
    { to: "/mobile/pendentes", label: `Pendentes${m.pend.length ? ` (${m.pend.length})` : ""}`, icon: CloudUpload },
    { to: "/mobile/perfil", label: "Sessão", icon: User },
  ] as const;
  return (
    <nav className="grid grid-cols-3 border-t bg-card">
      {tabs.map((t) => (
        <Link key={t.to} to={t.to} className={cn("flex flex-col items-center gap-1 py-3 text-xs font-medium", path.startsWith(t.to) ? "text-brand" : "text-muted-foreground")}>
          <t.icon className="h-6 w-6" />{t.label}
        </Link>
      ))}
    </nav>
  );
}
