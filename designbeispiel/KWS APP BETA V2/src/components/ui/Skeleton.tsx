import React from 'react';

// Matches the skeleton example in SystemView (1:1 classes)
export function SkeletonBlock() {
  return (
    <div className="bg-white border border-[#E7F7E9] p-4 rounded-2xl flex items-center gap-4">
      <div className="w-16 h-16 rounded-xl bg-gray-100 animate-pulse"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
        <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse"></div>
      </div>
    </div>
  );
}

export default SkeletonBlock;
