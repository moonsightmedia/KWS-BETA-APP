import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FeedbackDialog } from './FeedbackDialog';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
          'bg-primary hover:bg-primary/90',
          'flex items-center justify-center',
          'transition-all duration-200',
          'hover:scale-110 active:scale-95'
        )}
        aria-label="Feedback senden"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

