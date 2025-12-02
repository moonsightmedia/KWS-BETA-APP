import React from 'react';
import { cn } from '../../lib/utils';

export type CardShellProps = React.HTMLAttributes<HTMLDivElement> & {
  padded?: boolean; // adds default padding like many cards in the HTML
};

export function CardShell({ className, children, padded, ...props }: CardShellProps) {
  return (
    <div
      className={cn('bg-white border border-[#E7F7E9] rounded-2xl shadow-sm', padded ? 'p-4' : undefined, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default CardShell;
