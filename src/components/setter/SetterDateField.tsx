import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function SetterDateField({
  value,
  onChange,
  disabled,
}: {
  value?: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="setter-schedule-date"
          variant="secondary"
          disabled={disabled}
          aria-label="Datum wählen"
          className="w-full justify-start font-normal"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {value
            ? value.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "Datum wählen"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[130] w-auto rounded-kws-card border-0 p-2 shadow-medium"
      >
        <DayPicker
          mode="single"
          locale={de}
          selected={value}
          defaultMonth={value}
          disabled={{ before: today }}
          onSelect={(date) => {
            if (date) {
              onChange(date);
              setOpen(false);
            }
          }}
          showOutsideDays
          classNames={{
            months: "flex",
            month: "space-y-2",
            caption: "relative flex h-11 items-center justify-center",
            caption_label: "text-sm font-semibold",
            nav: "flex items-center",
            nav_button:
              "absolute top-0 grid h-11 w-11 place-items-center rounded-kws-control hover:bg-secondary",
            nav_button_previous: "left-0",
            nav_button_next: "right-0",
            table: "border-collapse",
            head_row: "flex",
            head_cell:
              "w-11 py-2 text-center text-xs font-normal text-muted-foreground",
            row: "flex",
            cell: "p-0 text-center",
            day: "grid h-11 w-11 place-items-center rounded-kws-control text-sm hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
            day_selected: "!bg-primary text-primary-foreground font-semibold",
            day_today: "font-semibold text-primary-ink",
            day_outside: "text-muted-foreground",
            day_disabled: "opacity-40",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
