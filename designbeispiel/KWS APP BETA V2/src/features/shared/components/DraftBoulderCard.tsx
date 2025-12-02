import React from 'react';
import { CameraOff, Edit } from 'lucide-react';

export function DraftBoulderCard() {
  return (
    <div className="bg-white border border-dashed border-[#13112B]/20 p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 px-2 py-1 bg-[#E08636] text-white text-[10px] font-bold rounded-bl-lg">DRAFT</div>
      <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
        <CameraOff className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-heading text-xl font-medium text-[#13112B]/70 italic">Unbenannter Boulder</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[#E08636] font-medium">Video fehlt</span>
        </div>
      </div>
      <button className="p-2 text-[#13112B]/40 hover:text-[#13112B]">
        <Edit className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default DraftBoulderCard;
