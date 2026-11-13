import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { securelog, type SecureLogUser } from "@/lib/securelog-api";
import { Bell, Camera, ChevronDown, Cpu, HardDrive, LayoutDashboard, ListChecks, LogOut, MapPin, Menu, Activity, Search, Settings, Smartphone, Trash2, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Confirm, Logo } from "@/components/sl/ui";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const main = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { to: "/admin/leituras", label: "Leituras", icon: ListChecks },
  { to: "/admin/pesquisar", label: "Pesquisar código", icon: Search },
  { to: "/admin/locais", label: "Locais", icon: MapPin },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
] as const;
const config = [
  { to: "/admin/gravadores", label: "Gravadores", icon: HardDrive },
  { to: "/admin/cameras", label: "Câmeras", icon: Camera },
  { to: "/admin/dispositivos", label: "Dispositivos", icon: Cpu },
  { to: "/admin/monitoramento", label: "Monitoramento", icon: Activity },
  { to: "/admin/retencao", label: "Retenção de mídia", icon: Trash2 },
] as const;
const operations = main.slice(0, 3);
const registers = main.slice(3);

function Nav({ onNav }: { onNav?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = (to: string) => (to === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(to));
  const [open, setOpen] = useState(true);
  const item = (i: (typeof main)[number] | (typeof config)[number], sub?: boolean) => (
    <Link key={i.to} to={i.to} onClick={onNav}
      className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", sub && "pl-9", active(i.to) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary")}>
      <i.icon className="h-4 w-4" />{i.label}
    </Link>
  );
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-5"><Logo light /></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">Operação</p>
        {operations.map((i) => item(i))}
        <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">Cadastros</p>
        {registers.map((i) => item(i))}
        <button onClick={() => setOpen(!open)} className="mt-4 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent">
          <Settings className="h-4 w-4" />Administração<ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", !open && "-rotate-90")} />
        </button>
        {open && config.map((i) => item(i, true))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Link to="/mobile" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"><Smartphone className="h-4 w-4" />App do coletor</Link>
      </div>
    </div>
  );
}

function AdminLayout() {
  const [mob, setMob] = useState(false);
  const [sair, setSair] = useState(false);
  const nav = useNavigate();
  const [currentUser, setCurrentUser] = useState<SecureLogUser | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let mounted = true;
    securelog.me().then(({user}) => { if (mounted) setCurrentUser(user); }).catch(() => { if (mounted) nav({to:"/"}); }).finally(() => { if (mounted) setChecking(false); });
    return () => { mounted = false; };
  }, [nav]);
  if (checking || !currentUser) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Verificando acesso...</div>;
  return (
      <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-52 lg:block"><Nav /></aside>
      <Sheet open={mob} onOpenChange={setMob}>
        <SheetContent side="left" className="w-64 border-0 p-0"><SheetTitle className="sr-only">Menu</SheetTitle><Nav onNav={() => setMob(false)} /></SheetContent>
      </Sheet>
      <div className="lg:pl-52">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMob(true)} aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button>
          <div className="hidden sm:block"><p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Operação — Rastreabilidade</p><p className="text-sm font-semibold text-primary">Painel SecureLog</p></div>
          <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">Homologação</span>
          <div className="ml-auto flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
                  <Bell className="h-5 w-5" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <p className="border-b px-4 py-2.5 text-sm font-semibold">Notificações</p>
                <div className="px-4 py-4 text-sm text-muted-foreground">Alertas reais serão exibidos conforme os equipamentos reportarem estado.</div>
              </PopoverContent>
            </Popover>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">{currentUser.role}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{currentUser.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}</div>
            <Button variant="ghost" size="icon" onClick={() => setSair(true)} aria-label="Sair"><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 lg:p-6"><Outlet /></main>
      </div>
      <Confirm open={sair} onOpenChange={setSair} title="Sair do SecureLog?" description="Sua sessão será encerrada neste navegador." confirmLabel="Sair" onConfirm={async () => { await securelog.logout().catch(() => undefined); nav({ to: "/" }); }} />
    </div>
  );
}
