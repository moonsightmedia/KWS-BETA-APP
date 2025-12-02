import React from 'react';
import { cn } from '../../lib/utils';

// Be flexible about rendered element to avoid TS narrowing to SVG types when using generic tag names
export type BadgeProps = React.HTMLAttributes<HTMLElement> & {
  as?: keyof JSX.IntrinsicElements;
};

export function Badge({ className, children, as: Tag = 'span', ...props }: BadgeProps) {
  return (
    <Tag
      className={cn(
        'text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold border border-gray-200',
        className
      )}
      {...(props as any)}
    >
      {children}
    </Tag>
  );
}

export default Badge;
