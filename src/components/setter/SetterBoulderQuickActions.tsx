import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { kwsPopoverClassName } from '@/components/ui/kws-surface';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SetterBoulderQuickActions({
  id, name, disabled, onRename, onEdit, onDelete,
}: {
  id: string;
  name: string;
  disabled: boolean;
  onRename: () => void;
  onEdit: () => void;
  onDelete: (trigger: HTMLButtonElement | null) => void;
}) {
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  return (
    <div className="flex shrink-0 flex-col sm:flex-row">
      <Button id={`rename-boulder-${id}`} variant="ghost" size="icon" disabled={disabled}
        aria-label={`${name} umbenennen`} onClick={onRename}>
        <Pencil aria-hidden="true" className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={menuTrigger} variant="ghost" size="icon" disabled={disabled}
            aria-label={`Aktionen für ${name}`}>
            <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" collisionPadding={16}
          className={cn(kwsPopoverClassName, 'z-[120]')}
          onCloseAutoFocus={event => {
            const action = pendingAction.current;
            pendingAction.current = null;
            if (action) {
              event.preventDefault();
              // Wait for menu focus/pointer cleanup before mounting another modal.
              requestAnimationFrame(() => { if (menuTrigger.current?.isConnected) action(); });
            }
          }}>
          <DropdownMenuItem className="min-h-11" onSelect={() => { pendingAction.current = onEdit; }}>
            <Pencil aria-hidden="true" className="mr-2 h-4 w-4" />Boulder bearbeiten
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-11 text-destructive" onSelect={() => {
            pendingAction.current = () => onDelete(menuTrigger.current);
          }}>
            <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />Boulder löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SetterBoulderNameEditor({ name, value, onValueChange, disabled, unavailable, onSave, onCancel }: {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  unavailable: boolean;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const pending = working || disabled;
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);

  const save = async () => {
    if (lock.current || disabled || unavailable) return;
    const next = value.trim();
    if (!next) {
      setError('Bitte einen Namen eingeben.');
      input.current?.focus();
      return;
    }
    if (next === name.trim()) { onCancel(); return; }
    lock.current = true;
    setWorking(true);
    setError('');
    try {
      await onSave(next);
      onCancel();
    } catch {
      setError('Name nicht gespeichert. Deine Eingabe bleibt erhalten. Bitte versuche es erneut.');
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };

  return (
    <form className="w-full space-y-2 px-2 pb-3" aria-label={`Name von ${name} bearbeiten`}
      aria-busy={pending} onSubmit={event => { event.preventDefault(); void save(); }}
      onKeyDown={event => {
        if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          if (!pending) onCancel();
        }
      }}>
      <Label htmlFor={id} className="text-xs">Bouldername</Label>
      <Input ref={input} id={id} value={value} disabled={pending} autoComplete="off"
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
        onChange={event => { onValueChange(event.target.value); setError(''); }} />
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>Abbrechen</Button>
        <Button type="submit" disabled={pending || unavailable}>
          {working && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}
          {working ? 'Wird gespeichert …' : 'Name speichern'}
        </Button>
      </div>
    </form>
  );
}
