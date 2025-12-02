import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export type ToggleSwitchProps = React.InputHTMLAttributes<HTMLInputElement> & {
  labelClassName?: string; // applies to the outer label wrapper
};

/**
 * Pixel-identical Toggle Switch to generated-page.html using Tailwind peer classes.
 * Renders a <label> wrapper with an sr-only checkbox and the visual track/knob div.
 */
export const ToggleSwitch = forwardRef<HTMLInputElement, ToggleSwitchProps>(function ToggleSwitch(
  { className, labelClassName, ...props },
  ref
) {
  return (
    <label className={cn('relative inline-flex items-center cursor-pointer', labelClassName)}>
      <input ref={ref} type="checkbox" className={cn('sr-only peer', className)} {...props} />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#36B531]"></div>
    </label>
  );
});

export default ToggleSwitch;
