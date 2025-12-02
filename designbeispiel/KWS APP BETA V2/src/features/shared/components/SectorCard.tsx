import React from 'react';

export function SectorCard() {
  return (
    <div className="bg-white border border-[#E7F7E9] p-0 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="h-24 bg-gray-200 relative">
        <img
          src="https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=400&h=200&fit=crop"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-3 left-4 text-white font-heading text-xl">SEKTOR CAVE</div>
      </div>
      <div className="p-3 flex justify-between items-center">
        <span className="text-xs text-[#13112B]/60 font-medium">24 Boulder aktiv</span>
        <button className="text-xs bg-[#F9FAF9] border border-[#E7F7E9] px-2 py-1 rounded-md text-[#13112B]">Details</button>
      </div>
    </div>
  );
}

export default SectorCard;
