import { useEffect, useRef, useState, type PointerEvent, type MouseEvent } from 'react';

/** Mouse preview across a portalled menu; click, touch and keyboard keep Radix behaviour. */
export function useHoverMenu() {
  const [open, setOpen] = useState(false);
  const hoverOpened = useRef(false);
  const suppressClick = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const clearTimer = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const onOpenChange = (next: boolean) => {
    clearTimer();
    hoverOpened.current = false;
    setOpen(next);
  };

  const onPointerEnter = (event: PointerEvent) => {
    clearTimer();
    if (open || event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    timer.current = setTimeout(() => {
      hoverOpened.current = true;
      setOpen(true);
    }, 140);
  };

  const onPointerLeave = () => {
    clearTimer();
    if (hoverOpened.current) {
      // Bridge the small gap between the trigger and the portalled surface.
      timer.current = setTimeout(() => setOpen(false), 300);
    }
  };

  const onKeyDownCapture = () => {
    clearTimer();
    hoverOpened.current = false;
  };

  return {
    open,
    onOpenChange,
    triggerProps: {
      onPointerEnter,
      onPointerLeave,
      onKeyDownCapture,
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        clearTimer();
        if (event.button !== 0 || event.ctrlKey) return;
        if (open && hoverOpened.current) {
          // Clicking a hover preview pins it, rather than immediately toggling it shut.
          event.preventDefault();
          hoverOpened.current = false;
          suppressClick.current = true;
          event.currentTarget.focus();
        }
      },
      onClick: (event: MouseEvent) => {
        if (suppressClick.current) {
          event.preventDefault();
          suppressClick.current = false;
        }
      },
    },
    contentProps: {
      onPointerEnter: clearTimer,
      onPointerLeave,
      onKeyDownCapture,
      onOpenAutoFocus: (event: Event) => {
        if (hoverOpened.current) event.preventDefault();
      },
      onCloseAutoFocus: (event: Event) => {
        if (hoverOpened.current) event.preventDefault();
      },
    },
  };
}
