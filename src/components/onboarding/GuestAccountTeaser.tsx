import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { useOnboarding } from './OnboardingContext';
export function GuestAccountTeaser() {
    const { showAccountPreview, showBenefits } = useOnboarding();
    return <KwsSurface className="mt-4 space-y-3 p-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><LockKeyhole aria-hidden="true" className="h-4 w-4 text-primary-ink"/>Fürs nächste Mal merken</h3>
    <p className="text-xs leading-relaxed text-muted-foreground">Mit einem Konto kannst du den Boulder speichern und deine Versuche oder Tops eintragen.</p>
    <Button variant="secondary" className="w-full text-xs" onClick={showAccountPreview}>Kurz ausprobieren<ArrowRight aria-hidden="true" className="h-4 w-4"/></Button>
    <Button variant="ghost" className="w-full text-xs" onClick={showBenefits}>Konto erstellen</Button>
  </KwsSurface>;
}
