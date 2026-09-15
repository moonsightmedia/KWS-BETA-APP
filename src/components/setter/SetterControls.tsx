import { useRef, useState, type ReactNode } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { kwsSurfaceClassName } from "@/components/ui/kws-surface";
import { cn } from "@/lib/utils";

export function SetterSearch({
  value,
  onChange,
  label = "Boulder suchen",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label={label}
        placeholder={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white pl-10 pr-11"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Suche leeren"
          disabled={disabled}
          className="absolute right-0 top-0"
          onClick={() => onChange("")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function SetterSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: ReactNode }>;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={label} className="w-full bg-white">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem value={o.value} key={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SetterState({
  title,
  description,
  loading,
  onRetry,
  retrying = false,
}: {
  title: string;
  description?: string;
  loading?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      className={cn(
        kwsSurfaceClassName,
        "flex flex-col items-center gap-3 px-5 py-10 text-center",
      )}
      role={onRetry ? "alert" : "status"}
      aria-busy={loading || retrying}
    >
      {loading && (
        <Loader2
          aria-hidden="true"
          className="h-5 w-5 animate-spin text-muted-foreground"
        />
      )}
      <p className="text-sm font-semibold">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Wird geladen …' : 'Erneut versuchen'}
        </Button>
      )}
    </div>
  );
}

export function SetterSelectionBar({
  count,
  onClear,
  disabled,
  children,
}: {
  count: number;
  onClear: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (!count) return null;
  return (
    <div className="sticky bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-30 mt-4 md:bottom-4">
      <div
        className={cn(
          kwsSurfaceClassName,
          "flex flex-wrap items-center gap-2 p-3 shadow-medium",
        )}
      >
        <p className="mr-auto text-sm font-semibold" role="status">
          {count} ausgewählt
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Auswahl aufheben"
          disabled={disabled}
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex w-full gap-2 [&>button]:flex-1 sm:w-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// Controlled async confirmation: failed requests stay open, double clicks cannot race.
export function SetterConfirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Löschen",
  destructive = true,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | boolean | Promise<void | boolean>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const confirm = async () => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      const result = await onConfirm();
      if (result !== false) onOpenChange(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Die Aktion ist fehlgeschlagen. Bitte erneut versuchen.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!lock.current) {
          setError("");
          onOpenChange(next);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2 [&>button]:flex-1">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() => void confirm()}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
