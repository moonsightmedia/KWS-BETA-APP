import { Bookmark, Check, Target } from "lucide-react";

export type BoulderStatus = "project" | "saved" | "attempted" | "done";
const states = {
  project: { label: "Projekt", Icon: Target },
  saved: { label: "Gespeichert", Icon: Bookmark },
  attempted: { label: "In Arbeit", Icon: Target },
  done: { label: "Geschafft", Icon: Check },
};
export function BoulderStatusBadge({ status }: { status: BoulderStatus }) {
  const { label, Icon } = states[status];
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-kws-badge bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-ink">
      <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}
