import { useId, useState } from "react";
import { DayPicker } from "react-day-picker";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shiftLocalDay, validStatisticsRange } from "@/lib/statisticsPeriod";

export function StatisticsPeriodPicker({
  from,
  to,
  today,
  onApply,
  onClose,
}: {
  from: string;
  to: string;
  today: string;
  onApply: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [start, setStart] = useState(from),
    [end, setEnd] = useState(to),
    [error, setError] = useState("");
  const date = (day: string) => (day ? new Date(day + "T12:00:00") : undefined);
  const startDate = date(start),
    endDate = date(end);
  const apply = () => {
    if (!validStatisticsRange(start, end, today)) {
      setError(
        "Wähle ein gültiges Von–Bis-Datum bis einschließlich heute. Das Ende darf nicht vor dem Beginn liegen.",
      );
      document.getElementById(id + "-from")?.focus();
      return;
    }
    onApply(start, end);
    onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        scrollLayout="contained"
        className="flex max-h-[92dvh] flex-col overflow-hidden p-0 md:max-w-md"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 p-4">
          <div>
            <DialogTitle>Zeitraum wählen</DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              Beginn und Ende zählen mit.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zeitraumauswahl schließen"
            onClick={onClose}
          >
            <X />
          </Button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "from", label: "Von", value: start, set: setStart },
              { key: "to", label: "Bis", value: end, set: setEnd },
            ].map((field) => (
              <div key={field.key} className="min-w-0 space-y-1.5">
                <Label htmlFor={id + "-" + field.key}>{field.label}</Label>
                <Input
                  id={id + "-" + field.key}
                  type="date"
                  max={today}
                  value={field.value}
                  aria-invalid={!!error}
                  aria-describedby={error ? id + "-error" : undefined}
                  className="min-w-0"
                  onChange={(event) => {
                    field.set(event.target.value);
                    setError("");
                  }}
                />
              </div>
            ))}
          </div>
          {error ? (
            <p
              id={id + "-error"}
              role="alert"
              className="text-xs text-destructive"
            >
              {error}
            </p>
          ) : null}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setStart(shiftLocalDay(today, -19));
              setEnd(today);
              setError("");
            }}
          >
            Letzte 20 Tage
          </Button>
          <DayPicker
            mode="range"
            locale={de}
            weekStartsOn={1}
            selected={{ from: startDate, to: endDate }}
            defaultMonth={endDate}
            disabled={{ after: new Date(today + "T23:59:59") }}
            onSelect={(range) => {
              setStart(range?.from ? localDate(range.from) : "");
              setEnd(range?.to ? localDate(range.to) : "");
              setError("");
            }}
            toMonth={new Date(today + "T12:00:00")}
            labels={{
              labelPrevious: () => "Vorheriger Monat",
              labelNext: () => "Nächster Monat",
            }}
            showOutsideDays
            className="mx-auto w-fit"
            classNames={{
              months: "flex",
              month: "space-y-2",
              caption: "relative flex h-11 items-center justify-center",
              caption_label: "text-sm font-semibold",
              nav: "flex items-center",
              nav_button:
                "absolute top-0 grid h-11 w-11 place-items-center rounded-kws-control hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
              nav_button_previous: "left-0",
              nav_button_next: "right-0",
              table: "border-collapse",
              head_row: "flex",
              head_cell: "w-11 py-2 text-center text-xs text-muted-foreground",
              row: "flex",
              cell: "p-0 text-center",
              day: "grid h-11 w-11 place-items-center rounded-kws-control text-sm hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
              day_selected: "!bg-primary font-semibold text-primary-foreground",
              day_range_middle: "rounded-none !bg-primary/10 text-foreground",
              day_today: "font-semibold text-primary-ink",
              day_outside: "text-muted-foreground",
              day_disabled: "opacity-40",
              day_hidden: "invisible",
            }}
            components={{
              IconLeft: () => <ChevronLeft className="h-4 w-4" />,
              IconRight: () => <ChevronRight className="h-4 w-4" />,
            }}
          />
        </div>
        <footer className="flex shrink-0 gap-2 border-t border-border/50 px-4 pb-[calc(1rem+var(--app-safe-area-bottom,0px))] pt-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button className="flex-1" onClick={apply}>
            Übernehmen
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
