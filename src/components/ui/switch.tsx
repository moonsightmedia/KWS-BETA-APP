import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-kws-control p-1 transition-colors duration-200 data-[state=checked]:bg-primary-strong data-[state=unchecked]:bg-switch-track data-[state=unchecked]:shadow-[inset_0_0_0_1px_hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-kws-badge bg-white shadow-[0_1px_4px_rgba(25,36,54,0.22)] ring-0 transition-[transform,background-color] duration-200 data-[state=checked]:bg-primary-foreground data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
