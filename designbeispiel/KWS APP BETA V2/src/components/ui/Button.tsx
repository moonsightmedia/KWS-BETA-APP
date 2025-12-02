import React from 'react';
import { cn } from '../../lib/utils';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function PrimaryButton({ className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'px-5 py-2.5 bg-[#36B531] text-white rounded-lg text-sm font-semibold shadow-md shadow-[#36B531]/20 active:scale-95 transition-transform',
        className
      )}
      {...props}
    />
  );
}

export function SecondaryButton({ className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'px-5 py-2.5 bg-white border border-[#E7F7E9] text-[#13112B] rounded-lg text-sm font-semibold hover:bg-[#F9FAF9] active:scale-95 transition-transform',
        className
      )}
      {...props}
    />
  );
}

export function IconButton({ className, ...props }: ButtonProps) {
  return (
    <button
      className={cn('p-2.5 bg-[#E7F7E9] text-[#36B531] rounded-lg active:scale-95 transition-transform', className)}
      {...props}
    />
  );
}

export default PrimaryButton;
