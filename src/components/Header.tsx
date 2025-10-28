import { Mountain } from 'lucide-react';

export const Header = () => {
  return (
    <header className="bg-gradient-hero shadow-medium sticky top-0 z-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3">
          <Mountain className="w-8 h-8 text-primary-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">
              Kletterwelt Sauerland
            </h1>
            <p className="text-sm text-primary-foreground/90">Beta Dashboard</p>
          </div>
        </div>
      </div>
    </header>
  );
};
