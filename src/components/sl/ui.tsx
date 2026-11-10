import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, ImageOff, Loader2, Pause, Play, ScanLine, ShieldCheck, Video, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { fmt, toInput, type Status } from "@/lib/format";

export function Logo({ light, size = "md" }: { light?: boolean; size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("grid place-items-center rounded-md bg-brand text-brand-foreground", size === "lg" ? "h-11 w-11" : "h-8 w-8")}>
        <ShieldCheck className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
      </div>
      <span className={cn("font-semibold tracking-tight", size === "lg" ? "text-2xl" : "text-lg", light ? "text-sidebar-accent-foreground" : "text-primary")}>
        Secure<span className="text-brand">Log</span>
      </span>
    </div>
  );
}

const statusMap: Record<Status, { label: string; cls: string }> = {
  online: { label: "Online", cls: "bg-success-soft text-success" },
  ativo: { label: "Ativo", cls: "bg-success-soft text-success" },
  sincronizado: { label: "Sincronizado", cls: "bg-success-soft text-success" },
  sincronizando: { label: "Sincronizando", cls: "bg-brand-soft text-brand" },
  pendente: { label: "Pendente", cls: "bg-warning-soft text-warning" },
  offline: { label: "Offline", cls: "bg-danger-soft text-destructive" },
  erro: { label: "Erro", cls: "bg-danger-soft text-destructive" },
  falha: { label: "Falha", cls: "bg-danger-soft text-destructive" },
  inativo: { label: "Inativo", cls: "bg-muted text-muted-foreground" },
};
export function StatusBadge({ status, label }: { status: Status; label?: string | undefined }) {
  const s = statusMap[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", s.cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? s.label}
    </span>
  );
}

export function PageHeader({ title, crumbs, actions }: { title: string; crumbs?: string[]; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {crumbs && <p className="mb-1 text-xs text-muted-foreground">{["SecureLog", ...crumbs].join(" / ")}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-primary">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, title, action }: { className?: string; children: ReactNode; title?: string; action?: ReactNode }) {
  return (
    <section className={cn("card-surface", className)}>
      {title && (
        <header className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold text-primary">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select className="field-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap px-4 py-3 text-sm", className)}>{children}</td>;
}
export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b bg-muted/60"><tr>{head}</tr></thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1).filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === total);
  const btn = "grid h-8 min-w-8 place-items-center rounded-md border bg-card px-2 text-sm hover:bg-accent disabled:opacity-40";
  return (
    <div className="flex items-center gap-1">
      <button className={btn} disabled={page === 1} onClick={() => onPage(1)} aria-label="Primeira página"><ChevronsLeft className="h-4 w-4" /></button>
      <button className={btn} disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1]! > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <button className={cn(btn, p === page && "border-brand bg-brand text-brand-foreground hover:bg-brand")} onClick={() => onPage(p)}>{p}</button>
        </span>
      ))}
      <button className={btn} disabled={page === total} onClick={() => onPage(page + 1)} aria-label="Próxima"><ChevronRight className="h-4 w-4" /></button>
      <button className={btn} disabled={page === total} onClick={() => onPage(total)} aria-label="Última página"><ChevronsRight className="h-4 w-4" /></button>
    </div>
  );
}

export function Confirm({ open, onOpenChange, title, description, confirmLabel = "Confirmar", onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirmLabel?: string; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CameraFrame({ camera, time, offline, children, className }: { camera: string; time: Date; offline?: boolean; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-md bg-media text-media-foreground", className)}>
      {offline ? (
        <div className="grid h-full place-items-center text-center text-sm"><div><ImageOff className="mx-auto mb-2 h-8 w-8 opacity-60" />Sem sinal de vídeo</div></div>
      ) : (
        <div className="grid h-full place-items-center text-center text-sm"><div><ImageOff className="mx-auto mb-2 h-8 w-8 opacity-60" />Nenhuma mídia real disponível</div></div>
      )}
      <div className="absolute left-2 top-2 rounded bg-media/80 px-1.5 py-0.5 font-mono text-[11px]">{camera}</div>
      <div className="absolute right-2 top-2 rounded bg-media/80 px-1.5 py-0.5 font-mono text-[11px]">{fmt(time)}</div>
      {children}
    </div>
  );
}

type MediaState = "idle" | "consultando" | "imagem" | "sem-imagem" | "video" | "falha";

export function MediaPanel({ camera, gravador, data }: { camera: string; gravador: string; data: Date }) {
  const [state, setState] = useState<MediaState>("idle");
  const [ini, setIni] = useState(toInput(new Date(data.getTime() - 30000)));
  const [fim, setFim] = useState(toInput(new Date(data.getTime() + 30000)));
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setProg((p) => (p >= 100 ? (setPlaying(false), 100) : p + 2)), 120);
    return () => clearInterval(t);
  }, [playing]);

  const buscar = (tipo: "imagem" | "video") => {
    setState("sem-imagem");
    setPlaying(false); setProg(0);
    toast.info("Integração de mídia com o NVR ainda não está configurada", { description: `${camera} • ${gravador}` });
  };

  const label: Record<MediaState, ReactNode> = {
    idle: <StatusBadge status="inativo" label="Aguardando consulta" />,
    consultando: <StatusBadge status="sincronizando" label="Consultando gravador" />,
    imagem: <StatusBadge status="online" label="Imagem disponível" />,
    "sem-imagem": <StatusBadge status="pendente" label="Imagem indisponível" />,
    video: <StatusBadge status="online" label="Vídeo encontrado" />,
    falha: <StatusBadge status="erro" label="Falha na consulta" />,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {label[state]}
        <span className="text-xs text-muted-foreground">NVR não configurado</span>
      </div>

      <CameraFrame camera={camera} time={data} offline={state === "sem-imagem" || state === "falha" || state === "idle"}>
        {state === "idle" && <div className="absolute inset-0 grid place-items-center bg-media text-sm"><div className="text-center"><ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />Snapshot ainda não consultado</div></div>}
        {state === "consultando" && (
          <div className="absolute inset-0 grid place-items-center bg-media/80">
            <div className="text-center text-sm"><Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin" />Consultando {gravador}…</div>
          </div>
        )}
        {state === "falha" && <div className="absolute inset-0 grid place-items-center bg-media text-sm"><div className="text-center"><AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />Não foi possível comunicar com o gravador</div></div>}
        {state === "video" && (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-media/85 px-3 py-2">
            <button onClick={() => { if (prog >= 100) setProg(0); setPlaying(!playing); }} aria-label={playing ? "Pausar" : "Reproduzir"}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="h-1 flex-1 rounded bg-media-foreground/25"><div className="h-1 rounded bg-brand" style={{ width: `${prog}%` }} /></div>
            <span className="font-mono text-[11px]">00:{String(Math.round((prog / 100) * 60)).padStart(2, "0")} / 01:00</span>
          </div>
        )}
      </CameraFrame>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Data/hora inicial"><Input type="datetime-local" value={ini} onChange={(e) => setIni(e.target.value)} /></Field>
        <Field label="Data/hora final"><Input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} /></Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => buscar("imagem")} disabled={state === "consultando"}><ImageIcon className="h-4 w-4" />Buscar imagem</Button>
        <Button onClick={() => buscar("video")} disabled={state === "consultando"}><Video className="h-4 w-4" />Buscar vídeo</Button>
        <Button variant="secondary" disabled={state !== "video"} onClick={() => toast.success("Download iniciado", { description: `trecho_${camera}_${ini.replace(/\D/g, "")}.mp4 (simulado)` })}>
          <Download className="h-4 w-4" />Baixar trecho
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({ title, text, icon }: { title: string; text: string; icon?: ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand">{icon ?? <ScanLine className="h-6 w-6" />}</div>
      <p className="font-medium text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export const meta = (title: string, description: string) => ({
  meta: [
    { title: `${title} — SecureLog` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — SecureLog` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
