import { useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrainingConversation } from './TrainingPlanner';

interface TrainingAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TrainingAssistant({ open, onOpenChange }: TrainingAssistantProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent scrollLayout="contained"
      className="flex max-h-[85dvh] flex-col overflow-hidden p-0 md:w-[480px]"
      onOpenAutoFocus={(event) => { event.preventDefault(); closeRef.current?.focus(); }}>
      <DialogHeader className="shrink-0 border-b border-border px-4 py-3 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kws-control bg-primary/10 text-primary-ink"><MessageCircle className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><DialogTitle>Dein Trainingsplan</DialogTitle><DialogDescription className="mt-1 text-xs">Geführter Plan-Assistent · UI-Vorschau</DialogDescription></div>
          <Button ref={closeRef} type="button" variant="ghost" size="icon" aria-label="Plan-Assistent schließen" onClick={() => onOpenChange(false)}><X aria-hidden="true" /></Button>
        </div>
      </DialogHeader>
      <TrainingConversation contained onComplete={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>;
}
