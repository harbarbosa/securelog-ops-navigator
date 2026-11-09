import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function FormDialog({ open, onOpenChange, title, onSave, children, extra }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; onSave: () => void; children: ReactNode; extra?: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form id="crud-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onSave(); }}>{children}</form>
        <DialogFooter className="gap-2 sm:justify-between">
          <div>{extra}</div>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" form="crud-form">Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useCrud<T extends { id: string }>(initial: T[], blank: T) {
  return { initial, blank };
}
