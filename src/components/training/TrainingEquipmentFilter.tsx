import { useId } from 'react';
import { Check, Dumbbell, Grip, Mountain, PersonStanding, RectangleHorizontal, StretchHorizontal, Weight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainingEquipmentFilterProps {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
}

export function TrainingEquipmentIcon({ equipment, className }: { equipment: string; className?: string }) {
  if (equipment === 'Klimmzugstange' || equipment === 'Trainingsbank' || equipment === 'EZ-Stange') {
    return <svg aria-hidden="true" className={cn('h-5 w-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {equipment === 'Klimmzugstange' ? <path d="M4 21V5h16v16M4 8h16" /> : equipment === 'Trainingsbank' ? <><path d="M3 8h18v4H3zM6 12v8M18 12v8M4 20h4M16 20h4" /></> : <><path d="m5 12 4-3 6 6 4-3M3 8v8M5 8v8M19 8v8M21 8v8" /></>}
    </svg>;
  }
  const Icon = equipment === 'Kettlebell' ? Weight
    : equipment === 'Trainingsbank' ? RectangleHorizontal
      : equipment === 'Kurzhanteln' || equipment === 'EZ-Stange' ? Dumbbell
        : equipment === 'Widerstandsband' ? StretchHorizontal
          : equipment === 'Fingerboard' || equipment === 'Klimmzugstange' ? Grip
            : equipment === 'Boulderwand' || equipment === 'Spraywall' ? Mountain
              : PersonStanding;
  return <Icon aria-hidden="true" className={cn('h-5 w-5 shrink-0', className)} />;
}

/** Native radios retain arrow-key navigation and expose selection without colour. */
export default function TrainingEquipmentFilter({ options, value, onValueChange }: TrainingEquipmentFilterProps) {
  const name = useId();
  return <fieldset>
    <legend className="mb-2 text-sm font-semibold">Equipment</legend>
    <div className="space-y-1">
      {['all', ...options].map(option => {
        const selected = value === option;
        return <label key={option} className={cn('relative flex min-h-11 cursor-pointer items-center gap-3 rounded-kws-control px-3 py-2 text-sm transition-colors hover:bg-secondary has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[-2px] has-[:focus-visible]:outline-ring', selected && 'bg-primary/5')}>
          <input className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" type="radio" name={name} value={option} checked={selected} onChange={() => onValueChange(option)} />
          <TrainingEquipmentIcon equipment={option} className="text-muted-foreground" />
          <span className="min-w-0 flex-1">{option === 'all' ? 'Alle Geräte' : option}</span>
          <span aria-hidden="true" className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', selected ? 'border-primary-ink bg-primary/10 text-primary-ink' : 'border-input')}>{selected && <Check className="h-3 w-3" strokeWidth={2.5} />}</span>
        </label>;
      })}
    </div>
  </fieldset>;
}
