import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, ImageOff, Loader2, Pause, Play, ScanLine, ShieldCheck, Video, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { fmt, toInput, type Status } from "@/lib/format";
import { api, securelogApiBase } from "@/lib/securelog-api";
import Hls from "hls.js";

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
      <div className="absolute left-2 top-2 z-10 rounded bg-media/80 px-1.5 py-0.5 font-mono text-[11px]">{camera}</div>
      <div className="absolute right-2 top-2 z-10 rounded bg-media/80 px-1.5 py-0.5 font-mono text-[11px]">{fmt(time)}</div>
      {children}
    </div>
  );
}

type MediaState = "idle" | "consultando" | "video" | "sem-video" | "falha";
type MediaFile = { start_time: string; end_time: string; file_path: string };

export function MediaPanel({ camera, gravador, cameraId, data }: { camera: string; gravador: string; cameraId?: string | null; data: Date }) {
  const [state, setState] = useState<MediaState>("idle");
  const [ini, setIni] = useState(toInput(new Date(data.getTime() - 30000)));
  const [fim, setFim] = useState(toInput(new Date(data.getTime() + 30000)));
  const [playlist, setPlaylist] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!playlist || !videoRef.current) return;
    const video = videoRef.current;
    if (Hls.isSupported()) {
      const hls = new Hls({
        autoStartLoad: true,
        lowLatencyMode: false,
        xhrSetup: (xhr) => { xhr.withCredentials = true; },
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) toast.error(`Falha ao carregar a gravação (${data.details})`);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => { void video.play().catch(() => undefined); });
      hls.attachMedia(video); hls.loadSource(playlist);
      return () => hls.destroy();
    }
    video.src = playlist;
    void video.play().catch(() => undefined);
    return;
  }, [playlist]);

  const buscar = async () => {
    if (!cameraId) { toast.error("A leitura não possui câmera associada"); return; }
    setState("consultando");
    try {
      const query = `camera_id=${encodeURIComponent(cameraId)}&start=${encodeURIComponent(new Date(ini).toISOString())}&end=${encodeURIComponent(new Date(fim).toISOString())}`;
      const found = await api<{ items: MediaFile[] }>(`/api/media/search?${query}`);
      if (!found.items.length) { setState("sem-video"); toast.info("Nenhuma gravação encontrada no período"); return; }
      const job = await api<{ playlist: string }>("/api/media/playback", { method: "POST", body: JSON.stringify({ camera_id: cameraId, start: new Date(ini).toISOString(), end: new Date(fim).toISOString() }) });
      setPlaylist(`${securelogApiBase}${job.playlist}`); setState("video");
    } catch (error) { setState("falha"); toast.error(error instanceof Error ? error.message : "Falha ao consultar o gravador"); }
  };
  const label: Record<MediaState, ReactNode> = { idle: <StatusBadge status="inativo" label="Aguardando consulta" />, consultando: <StatusBadge status="sincronizando" label="Consultando gravador" />, video: <StatusBadge status="online" label="Gravação disponível" />, "sem-video": <StatusBadge status="pendente" label="Nenhuma gravação encontrada" />, falha: <StatusBadge status="erro" label="Falha na consulta" /> };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">{label[state]}<span className="text-xs text-muted-foreground">{gravador}</span></div>
    <CameraFrame camera={camera} time={data} offline={state !== "video"}>
      {playlist && <video ref={videoRef} crossOrigin="use-credentials" controls autoPlay muted playsInline className="absolute inset-0 z-[1] h-full w-full bg-black object-contain" />}
    </CameraFrame>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Data/hora inicial"><Input type="datetime-local" value={ini} onChange={(e) => setIni(e.target.value)} /></Field><Field label="Data/hora final"><Input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} /></Field></div>
    <Button onClick={() => void buscar()} disabled={state === "consultando" || !cameraId}><Video className="h-4 w-4" />Buscar e reproduzir gravação</Button>
  </div>;
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
