import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export function BoulderCard() {
  return (
    <div className="bg-white border border-[#E7F7E9] p-4 rounded-2xl shadow-sm flex items-center gap-4 group">
      <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1522163182402-834f871fd851?w=150&h=150&fit=crop"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#5681EA] rounded-full border border-white"></div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-heading text-xl font-medium text-[#13112B] truncate">Blue Roof V1</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[#13112B]/50 font-medium">Sektor Cave</span>
          <span className="text-xs text-[#13112B]/30">•</span>
          <span className="text-xs text-[#13112B]/50">Set by Alex</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold border border-gray-200">5B</span>
        <CheckCircle2 className="w-4 h-4 text-[#36B531]" strokeWidth={1.5} />
      </div>
    </div>
  );
}

export default BoulderCard;
