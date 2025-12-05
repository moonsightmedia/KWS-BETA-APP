import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, CaptionProps, useDayPicker, useNavigation } from "react-day-picker";
import { setDate, setMonth, setYear, startOfMonth, getDaysInMonth } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// Context to pass onSelect to CustomCaptionDropdowns
const CalendarContext = React.createContext<{
  onSelect?: (date: Date | undefined) => void;
}>({});

// Custom Caption Component with Day, Month, and Year dropdowns
function CustomCaptionDropdowns(props: CaptionProps) {
  const { classNames, styles, locale, formatters, fromDate, toDate } = useDayPicker();
  const { goToMonth } = useNavigation();
  const { displayMonth } = props;
  const { onSelect } = React.useContext(CalendarContext);

  // Get days in current month
  const daysInMonth = getDaysInMonth(displayMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Get months
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = setMonth(startOfMonth(new Date()), i);
    return {
      value: i,
      label: formatters.formatMonthCaption(date, { locale }),
    };
  });

  // Get years (from fromDate to toDate)
  const fromYear = fromDate?.getFullYear() || new Date().getFullYear() - 10;
  const toYear = toDate?.getFullYear() || new Date().getFullYear() + 10;
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);

  // Handle day change
  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = Number(e.target.value);
    const newDate = setDate(displayMonth, newDay);
    goToMonth(newDate);
    // Also call onSelect to actually select the date
    if (onSelect) {
      // Use setTimeout to ensure state updates properly
      setTimeout(() => {
        onSelect(newDate);
      }, 0);
    }
  };

  // Handle month change
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMonth = Number(e.target.value);
    const newMonth = setMonth(startOfMonth(displayMonth), selectedMonth);
    // Adjust day if it exceeds days in new month
    const daysInNewMonth = getDaysInMonth(newMonth);
    const adjustedDay = Math.min(displayMonth.getDate(), daysInNewMonth);
    const finalDate = setDate(newMonth, adjustedDay);
    goToMonth(finalDate);
    // Also call onSelect to actually select the date
    if (onSelect) {
      // Use setTimeout to ensure state updates properly
      setTimeout(() => {
        onSelect(finalDate);
      }, 0);
    }
  };

  // Handle year change
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedYear = Number(e.target.value);
    const newMonth = setYear(startOfMonth(displayMonth), selectedYear);
    // Adjust day if it exceeds days in new month (e.g., Feb 29 -> Feb 28)
    const daysInNewMonth = getDaysInMonth(newMonth);
    const adjustedDay = Math.min(displayMonth.getDate(), daysInNewMonth);
    const finalDate = setDate(newMonth, adjustedDay);
    goToMonth(finalDate);
    // Also call onSelect to actually select the date
    if (onSelect) {
      // Use setTimeout to ensure state updates properly
      setTimeout(() => {
        onSelect(finalDate);
      }, 0);
    }
  };

  return (
    <div className={cn("flex items-center gap-2 justify-center w-full py-4 px-2", classNames.caption_dropdowns)} style={styles.caption_dropdowns}>
      {/* Day Dropdown */}
      <select
        value={displayMonth.getDate()}
        onChange={handleDayChange}
        className="h-11 px-3 rounded-xl border border-[#E7F7E9] bg-white text-sm text-[#13112B] focus:outline-none focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531] hover:bg-[#F9FAF9] transition-colors appearance-none cursor-pointer flex-1 sm:flex-none sm:min-w-[70px] shadow-sm"
      >
        {days.map((day) => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>

      {/* Month Dropdown */}
      <select
        value={displayMonth.getMonth()}
        onChange={handleMonthChange}
        className="h-11 px-3 rounded-xl border border-[#E7F7E9] bg-white text-sm text-[#13112B] focus:outline-none focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531] hover:bg-[#F9FAF9] transition-colors appearance-none cursor-pointer flex-1 sm:flex-none sm:min-w-[120px] shadow-sm"
      >
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>

      {/* Year Dropdown */}
      <select
        value={displayMonth.getFullYear()}
        onChange={handleYearChange}
        className="h-11 px-3 rounded-xl border border-[#E7F7E9] bg-white text-sm text-[#13112B] focus:outline-none focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531] hover:bg-[#F9FAF9] transition-colors appearance-none cursor-pointer flex-1 sm:flex-none sm:min-w-[80px] shadow-sm"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

function Calendar({ className, classNames, showOutsideDays = true, onSelect, ...props }: CalendarProps) {
  return (
    <CalendarContext.Provider value={{ onSelect }}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-2 sm:p-4 bg-white", className)}
        captionLayout="dropdown-buttons"
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center gap-2 w-full",
          caption_label: "hidden",
          caption_dropdowns: "flex items-center gap-2 w-full",
          dropdown: "hidden",
          dropdown_month: "hidden",
          dropdown_year: "hidden",
          dropdown_icon: "hidden",
          nav: "hidden",
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "hidden",
          head_row: "hidden",
          head_cell: "hidden",
          row: "hidden",
          cell: "hidden",
          day: "hidden",
          day_range_end: "hidden",
          day_selected: "hidden",
          day_today: "hidden",
          day_outside: "hidden",
          day_disabled: "hidden",
          day_range_middle: "hidden",
          day_hidden: "hidden",
          ...classNames,
        }}
        components={{
          IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
          CaptionDropdowns: CustomCaptionDropdowns,
        }}
        onSelect={onSelect}
        {...props}
      />
    </CalendarContext.Provider>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
