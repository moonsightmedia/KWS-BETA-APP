import { useEffect, useRef, useState, type PointerEvent, type MouseEvent } from 'react';

/** Mouse preview across a portalled menu; click, touch and keyboard keep Radix behaviour. */
export function useHoverMenu() {
  const [open, setOpen] = useState(false);
  const hoverOpened = useRef(false);
  const suppressClick = useRef(false);
  const pinTrigger = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const clearTimer = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const onOpenChange = (next: boolean) => {
    clearTimer();
    hoverOpened.current = false;
    if (!next) { suppressClick.current = false; pinTrigger.current = null; }
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
    pin: () => { clearTimer(); hoverOpened.current = false; },
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
          pinTrigger.current = event.currentTarget;
          // Keep the current focus: focusing the trigger here is a focus-outside
          // event for an already open Radix menu and immediately dismisses it.
        }
      },
      onClick: (event: MouseEvent) => {
        if (suppressClick.current) {
          event.preventDefault();
          suppressClick.current = false;
          pinTrigger.current = null;
        }
      },
      onPointerCancel: () => { suppressClick.current = false; pinTrigger.current = null; },
    },
    contentProps: {
      onPointerEnter: clearTimer,
      onPointerLeave,
      onKeyDownCapture,
      onPointerDownOutside: (event: CustomEvent<{ originalEvent: globalThis.PointerEvent }>) => {
        const target = event.detail.originalEvent.target;
        // Radix reports the trigger pointerdown as outside after our handler
        // pinned the preview. Exempt only that same trigger for this one click.
        if (
          suppressClick.current &&
          target instanceof Node &&
          pinTrigger.current?.contains(target)
        ) {
          event.preventDefault();
        }
      },
      onOpenAutoFocus: (event: Event) => {
        if (hoverOpened.current) event.preventDefault();
      },
      onCloseAutoFocus: (event: Event) => {
        if (hoverOpened.current) event.preventDefault();
      },
    },
  };
}
