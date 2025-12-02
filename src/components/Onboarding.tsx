import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const ONBOARDING_STEPS = [
  {
    title: 'Willkommen!',
    content: 'Willkommen in der Kletterwelt Sa Beta App. Hier kannst du Boulder entdecken, Statistiken einsehen und vieles mehr.',
  },
  {
    title: 'Boulder durchstöbern',
    content: 'Entdecke alle Boulder in verschiedenen Sektoren. Filtere nach Schwierigkeit, Farbe oder Sektor.',
  },
  {
    title: 'Statistiken',
    content: 'Schaue dir Statistiken über die Boulder an und verfolge deine Fortschritte.',
  },
];

export const Onboarding = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] p-0 gap-0 [&>button]:hidden">
        <div className="relative p-6 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8"
            onClick={handleFinish}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="space-y-4 mt-8">
            <h2 className="text-2xl font-bold">{ONBOARDING_STEPS[currentStep].title}</h2>
            <p className="text-muted-foreground">{ONBOARDING_STEPS[currentStep].content}</p>
          </div>

          <div className="flex items-center justify-between mt-8">
            <div className="flex gap-1">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <Button onClick={handleNext} size="lg" className="min-h-[48px]">
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

