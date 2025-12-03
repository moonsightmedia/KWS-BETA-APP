import { useState, useEffect, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronRight, MessageSquare, AlertCircle, Heart, LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Context to allow opening onboarding from anywhere
interface OnboardingContextType {
  openOnboarding: () => void;
  isOpen: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    // Return a no-op function if provider is not available (shouldn't happen, but prevents crashes)
    console.warn('[useOnboarding] OnboardingProvider not found, returning no-op function');
    return {
      openOnboarding: () => {
        console.warn('[useOnboarding] OnboardingProvider not available');
      },
      isOpen: false,
    };
  }
  return context;
};

interface OnboardingStep {
  title: string;
  content: string;
  icon?: LucideIcon | null;
  badge?: string;
  showFeedbackHint?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Willkommen!',
    content: 'Willkommen in der Kletterwelt Sauerland Beta App! Hier kannst du Boulder entdecken, Statistiken einsehen und vieles mehr.',
  },
  {
    title: 'Boulder durchstöbern',
    content: 'Entdecke alle Boulder in verschiedenen Sektoren. Filtere nach Schwierigkeit, Farbe oder Sektor.',
  },
  {
    title: 'Statistiken',
    content: 'Schaue dir Statistiken über die Boulder an und verfolge deine Fortschritte.',
  },
  {
    title: 'Beta-Version',
    content: 'Du nutzt aktuell die Beta-Version der App. Es können noch Fehler auftreten oder Features fehlen. Wir arbeiten kontinuierlich an Verbesserungen!',
    icon: AlertCircle,
    badge: 'Beta',
  },
  {
    title: 'Feedback & Support',
    content: 'Probleme oder Verbesserungsvorschläge? Nutze den Feedback-Button oben rechts neben deinem Profilbild. Wir freuen uns sehr über deine Unterstützung und helfen gerne weiter!',
    icon: MessageSquare,
    showFeedbackHint: true,
  },
];

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const openOnboarding = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setIsOpen(false);
  };

  return (
    <OnboardingContext.Provider value={{ openOnboarding, isOpen }}>
      {children}
      {isOpen && (
        <OnboardingDialog
          isOpen={isOpen}
          currentStep={currentStep}
          onNext={handleNext}
          onFinish={handleFinish}
          onOpenChange={setIsOpen}
        />
      )}
    </OnboardingContext.Provider>
  );
};

interface OnboardingDialogProps {
  isOpen: boolean;
  currentStep: number;
  onNext: () => void;
  onFinish: () => void;
  onOpenChange: (open: boolean) => void;
}

const OnboardingDialog = ({ isOpen, currentStep, onNext, onFinish, onOpenChange }: OnboardingDialogProps) => {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-0 gap-0 [&>button]:hidden !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !bottom-auto !right-auto rounded-2xl border border-[#E7F7E9] !data-[state=closed]:zoom-out-95 !data-[state=open]:zoom-in-95 !data-[state=closed]:slide-out-to-bottom-0">
        <div className="relative p-4 sm:p-6 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8 z-10"
            onClick={onFinish}
          >
            <X className="h-4 w-4" />
          </Button>

          <DialogHeader className="mt-8 sm:mt-0">
            <div className="flex items-center gap-3">
              {ONBOARDING_STEPS[currentStep].icon && (
                <div className="flex-shrink-0">
                  {(() => {
                    const Icon = ONBOARDING_STEPS[currentStep].icon;
                    return Icon ? <Icon className="h-6 w-6 text-primary" /> : null;
                  })()}
                </div>
              )}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <DialogTitle className="text-xl sm:text-2xl font-bold truncate">{ONBOARDING_STEPS[currentStep].title}</DialogTitle>
                {ONBOARDING_STEPS[currentStep].badge && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {ONBOARDING_STEPS[currentStep].badge}
                  </Badge>
                )}
              </div>
            </div>
            <DialogDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-4">
              {ONBOARDING_STEPS[currentStep].content}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            
            {ONBOARDING_STEPS[currentStep].showFeedbackHint && (
              <Alert className="mt-4 border-primary/20 bg-primary/5">
                <MessageSquare className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs sm:text-sm">
                  <strong>Tipp:</strong> Der Feedback-Button ist immer oben rechts neben deinem Profilbild verfügbar.
                </AlertDescription>
              </Alert>
            )}
            
            {currentStep === ONBOARDING_STEPS.length - 1 && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Heart className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Vielen Dank für deine Unterstützung bei der Entwicklung der App!
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-6 sm:mt-8 gap-3">
            <div className="flex gap-1 shrink-0">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <Button onClick={onNext} size="lg" className="min-h-[48px] shrink-0">
              {currentStep < ONBOARDING_STEPS.length - 1 ? (
                <>
                  Weiter
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                'Los geht\'s!'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Backward compatibility: Export Onboarding component that uses the provider
export const Onboarding = () => {
  return <OnboardingProvider><></></OnboardingProvider>;
};

