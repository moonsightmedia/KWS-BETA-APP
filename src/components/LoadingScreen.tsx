import { Loader2 } from 'lucide-react';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#F9FAF9] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-sm mx-auto px-4">
        {/* Logo placeholder - you can replace this with actual logo */}
        <div className="w-24 h-24 mx-auto rounded-2xl bg-[#E7F7E9] flex items-center justify-center">
          <span className="text-3xl font-heading font-bold text-[#36B531]">KWS</span>
        </div>
        <div className="space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#36B531] mx-auto" />
          <div className="space-y-1">
            <h2 className="text-lg font-heading font-semibold text-[#13112B]">
              Willkommen
            </h2>
            <p className="text-sm text-[#13112B]/60">
              App wird geladen...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

