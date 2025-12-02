import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export function UserCard() {
  return (
    <div className="bg-white border border-[#E7F7E9] p-3 rounded-2xl shadow-sm flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#13112B] text-white flex items-center justify-center text-xs font-bold">AL</div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-[#13112B]">Alex Setter</div>
        <div className="text-xs text-[#13112B]/50">Routenschrauber</div>
      </div>
      <button className="p-2 text-gray-400 hover:text-[#13112B]">
        <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default UserCard;
