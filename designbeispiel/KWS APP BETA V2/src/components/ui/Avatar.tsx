import React from 'react';
import { cn } from '../../lib/utils';

export type AvatarProps = {
  initials?: string;
  className?: string;
};

// Visual avatar used across the app (initials in a circle)
export function Avatar({ initials = 'AL', className }: AvatarProps) {
  return (
    <div className={cn('w-10 h-10 rounded-full bg-[#13112B] text-white flex items-center justify-center text-xs font-bold', className)}>
      {initials}
    </div>
  );
}

export default Avatar;
