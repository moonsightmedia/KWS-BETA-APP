import { useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrainingConversation } from './TrainingPlanner';
import { useIsMobile } from '@/hooks/use-mobile';

interface TrainingAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TrainingAssistant({ open, onOpenChange }: TrainingAssistantProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const isMobile = useIsMobile();
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement && !document.activeElement.closest('[role="dialog"]')) returnFocusRef.current = document.activeElement;
  }, [open]);
  return <Dialog open={open} onOpenChange={onOpenChange} modal={isMobile}>
    <DialogContent scrollLayout="contained"
      aria-modal={isMobile || undefined}
      className="flex flex-col overflow-hidden p-0 max-md:[&.kws-dialog-surface]:!h-[70dvh] max-md:[&.kws-dialog-surface]:!max-h-[70dvh] md:!bottom-6 md:!left-auto md:!right-6 md:!top-auto md:h-[min(600px,calc(100dvh-3rem))] md:w-[480px] md:!translate-x-0 md:!translate-y-0"
      onInteractOutside={(event) => { if (!isMobile) event.preventDefault(); }}
      onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true }); }}
      onOpenAutoFocus={(event) => { event.preventDefault(); closeRef.current?.focus(); }}>
      <DialogHeader className="shrink-0 border-b border-border px-4 py-3 text-left">
        <div className="flex items-center gap-3">
          <img src="/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png" alt="Kletterwelt Sauerland" className="h-10 w-10 shrink-0 object-contain" />
          <div className="min-w-0 flex-1"><DialogTitle>Dein Trainingsplan</DialogTitle><DialogDescription className="mt-1 text-xs">Schritt für Schritt zu deiner Trainingswoche</DialogDescription></div>
          <Button ref={closeRef} type="button" variant="ghost" size="icon" aria-label="Plan-Assistent schließen" onClick={() => onOpenChange(false)}><X aria-hidden="true" /></Button>
        </div>
      </DialogHeader>
      <TrainingConversation contained onComplete={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>;
}
