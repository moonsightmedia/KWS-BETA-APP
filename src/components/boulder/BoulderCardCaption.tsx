import { cn } from "@/lib/utils";

/** One title line in the existing photo gradient; grade belongs in its badge. */
export function BoulderCardCaption({
  name,
  area,
  overview = false,
}: {
  name: string;
  area: string;
  overview?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 flex h-[46%] flex-col justify-end bg-gradient-to-t from-white via-white/90 to-transparent px-1.5 pb-1.5 pt-3 text-brand-ink sm:px-2 sm:pb-2",
        overview
          ? "sm:h-[48%] md:h-[40%] md:px-4 md:pb-4"
          : "md:h-[48%] md:px-3 md:pb-3",
      )}
    >
      <span
        title={name}
        data-boulder-caption
        className={cn(
          "block shrink-0 truncate text-xs font-bold leading-tight tracking-[-0.02em]",
          overview && "md:text-sm",
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          "mt-0.5 block shrink-0 truncate text-[11px] font-semibold leading-tight text-brand-ink/70",
          overview && "md:mt-1 md:text-xs",
        )}
      >
        {area}
      </span>
    </div>
  );
}
