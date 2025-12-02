import { useState, useEffect, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, LogIn, Trophy } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';

// Context to allow opening competition onboarding from anywhere
interface CompetitionOnboardingContextType {
  openCompetitionOnboarding: () => void;
}

const CompetitionOnboardingContext = createContext<CompetitionOnboardingContextType | undefined>(undefined);

export const useCompetitionOnboarding = () => {
  const context = useContext(CompetitionOnboardingContext);
  if (!context) {
    // Return a no-op function if provider is not available
    console.warn('[useCompetitionOnboarding] CompetitionOnboardingProvider not found, returning no-op function');
    return {
      openCompetitionOnboarding: () => {
        console.warn('[useCompetitionOnboarding] CompetitionOnboardingProvider not available');
      },
    };
  }
  return context;
};

const getCompetitionSteps = (isLoggedIn: boolean) => {
  if (!isLoggedIn) {
    // Onboarding for guests
    return [
      {
        title: 'Nikolaus Wettkampf',
        content: 'Willkommen beim Nikolaus Wettkampf! Als Gast kannst du die Live-Rangliste verfolgen und sehen, wie die Teilnehmer abschneiden.',
      },
      {
        title: 'Teilnahme',
        content: (
          <div className="space-y-3 text-left">
            <p>Um am Wettkampf teilzunehmen und deine Ergebnisse einzutragen, musst du dich anmelden.</p>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
              <LogIn className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm mb-1">Anmeldung erforderlich</p>
                <p className="text-xs text-muted-foreground">Nach der Anmeldung kannst du deine Ergebnisse eintragen und in der Rangliste erscheinen.</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Wertungssystem',
        content: (
          <div className="space-y-2 text-left">
            <p><strong>Flash:</strong> 10 Punkte (perfekte Ausführung)</p>
            <p><strong>Top:</strong> 10 - (Versuche - 1) Punkte (z.B. Top mit 1 Versuch = 10, mit 2 = 9, Minimum 5)</p>
            <p><strong>Zone:</strong> 5 Punkte</p>
            <p><strong>Nicht geschafft:</strong> 0 Punkte</p>
          </div>
        ),
      },
      {
        title: 'Rangliste',
        content: 'Die Rangliste zeigt alle Teilnehmer sortiert nach Punkten. Du kannst zwischen Gesamt, Männern und Frauen filtern.',
      },
    ];
  }

  // Onboarding for logged-in users
  return [
    {
      title: 'Nikolaus Wettkampf',
      content: 'Willkommen beim Nikolaus Wettkampf! Hier kannst du deine Ergebnisse eintragen und die Live-Rangliste verfolgen.',
    },
    {
      title: 'Teilnahme',
      content: (
        <div className="space-y-3 text-left">
          <p>Um teilzunehmen, musst du deine Klasse (M oder W) angeben. Diese wird einmalig beim ersten Teilnehmen abgefragt.</p>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
            <Trophy className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm mb-1">Klasse erforderlich</p>
              <p className="text-xs text-muted-foreground">Die Angabe deiner Klasse ist verpflichtend, damit du in der richtigen Kategorie gewertet wirst.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Wertungssystem',
      content: (
        <div className="space-y-2 text-left">
          <p><strong>Flash:</strong> 10 Punkte (perfekte Ausführung)</p>
          <p><strong>Top:</strong> 10 - (Versuche - 1) Punkte (z.B. Top mit 1 Versuch = 10, mit 2 = 9, Minimum 5)</p>
          <p><strong>Zone:</strong> 5 Punkte</p>
          <p><strong>Nicht geschafft:</strong> 0 Punkte</p>
        </div>
      ),
    },
    {
      title: 'Ergebnis eintragen',
      content: 'Klicke auf einen Boulder und wähle dein Ergebnis. Bei "Top" gibst du zusätzlich die Anzahl der Versuche ein. Du kannst deine Ergebnisse jederzeit ändern.',
    },
    {
      title: 'Rangliste',
      content: 'Die Rangliste zeigt alle Teilnehmer sortiert nach Punkten. Du kannst zwischen Gesamt, Männern und Frauen filtern. Klicke auf einen Teilnehmer, um die detaillierten Ergebnisse zu sehen.',
    },
  ];
};

export const CompetitionOnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const COMPETITION_STEPS = getCompetitionSteps(!!user);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenCompetitionOnboarding = localStorage.getItem('hasSeenCompetitionOnboarding');
    if (!hasSeenCompetitionOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const openCompetitionOnboarding = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const handleNext = () => {
    if (currentStep < COMPETITION_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    localStorage.setItem('hasSeenCompetitionOnboarding', 'true');
    setIsOpen(false);
  };

  return (
    <CompetitionOnboardingContext.Provider value={{ openCompetitionOnboarding }}>
      {children}
      {isOpen && (
        <CompetitionOnboardingDialog
          isOpen={isOpen}
          currentStep={currentStep}
          steps={COMPETITION_STEPS}
          onNext={handleNext}
          onFinish={handleFinish}
          onOpenChange={setIsOpen}
        />
      )}
    </CompetitionOnboardingContext.Provider>
  );
};

interface CompetitionOnboardingDialogProps {
  isOpen: boolean;
  currentStep: number;
  steps: Array<{ title: string; content: string | React.ReactNode }>;
  onNext: () => void;
  onFinish: () => void;
  onOpenChange: (open: boolean) => void;
}

const CompetitionOnboardingDialog = ({ isOpen, currentStep, steps, onNext, onFinish, onOpenChange }: CompetitionOnboardingDialogProps) => {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] p-0 gap-0 [&>button]:hidden">
        <div className="relative p-6 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8"
            onClick={onFinish}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="space-y-4 mt-8">
            <h2 className="text-2xl font-bold">{steps[currentStep].title}</h2>
            <div className="text-muted-foreground">
              {typeof steps[currentStep].content === 'string' ? (
                <p>{steps[currentStep].content}</p>
              ) : (
                steps[currentStep].content
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-8">
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <Button onClick={onNext} size="lg" className="min-h-[48px]">
              {currentStep < steps.length - 1 ? (
                <>
                  Weiter
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                'Verstanden!'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Backward compatibility: Export CompetitionOnboarding component that uses the provider
export const CompetitionOnboarding = () => {
  return <CompetitionOnboardingProvider><></></CompetitionOnboardingProvider>;
};

