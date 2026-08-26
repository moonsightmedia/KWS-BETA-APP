import type { ReactNode } from 'react';
import { Check, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const ToastIcon = ({ children, className }: { children: ReactNode; className: string }) => (
  <span className={`grid h-9 w-9 place-items-center rounded-kws-control ${className}`}>
    {children}
  </span>
);

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      swipeDirections={['left', 'right']}
      closeButton
      expand
      gap={8}
      duration={4200}
      visibleToasts={3}
      offset={{ top: 'calc(var(--app-safe-area-top) + 1rem)' }}
      mobileOffset={{
        top: 'calc(var(--app-safe-area-top) + 0.75rem)',
        left: '1rem',
        right: '1rem',
      }}
      containerAriaLabel="Systemmeldungen"
      icons={{
        success: (
          <ToastIcon className="bg-[#E7F7E9] text-[#287E2B]">
            <Check className="h-4 w-4" strokeWidth={2.3} aria-hidden="true" />
          </ToastIcon>
        ),
        error: (
          <ToastIcon className="bg-[#FFF1EF] text-[#C6453A]">
            <X className="h-4 w-4" strokeWidth={2.3} aria-hidden="true" />
          </ToastIcon>
        ),
        warning: (
          <ToastIcon className="bg-[#FFF6E6] text-[#98600A]">
            <TriangleAlert className="h-4 w-4" strokeWidth={2.1} aria-hidden="true" />
          </ToastIcon>
        ),
        info: (
          <ToastIcon className="bg-[#F1F5F1] text-[#192436]">
            <Info className="h-4 w-4" strokeWidth={2.1} aria-hidden="true" />
          </ToastIcon>
        ),
        loading: (
          <ToastIcon className="bg-[#E7F7E9] text-[#287E2B]">
            <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" strokeWidth={2.1} aria-hidden="true" />
          </ToastIcon>
        ),
        close: <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast !w-[min(23rem,calc(100vw-2rem))] !items-start !gap-3 !rounded-kws-card !border-0 !bg-white !p-3.5 !pr-12 !font-sans !text-[#192436] !shadow-[0_8px_30px_rgba(25,36,54,0.14)] focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-[#36B531]/35 focus-visible:!ring-offset-0',
          content: '!min-w-0 !flex-1 !gap-0.5',
          title: '!text-[13px] !font-semibold !leading-[1.4] !text-[#192436]',
          description: '!text-xs !leading-[1.55] !text-muted-foreground',
          icon: '!m-0 !h-9 !w-9 !shrink-0 !self-start',
          closeButton:
            '!left-auto !right-2.5 !top-2.5 !h-8 !w-8 !translate-x-0 !translate-y-0 !rounded-kws-control !border-0 !bg-[#F1F5F1] !text-[#192436]/55 hover:!bg-[#E5EBE6] hover:!text-[#192436] focus-visible:!outline-none focus-visible:!shadow-[0_0_0_2px_rgba(54,181,49,0.35)]',
          actionButton:
            '!h-9 !rounded-kws-control !bg-[#36B531] !px-3 !text-xs !font-semibold !text-white hover:!bg-[#2DA029] focus-visible:!outline-none focus-visible:!shadow-[0_0_0_2px_rgba(54,181,49,0.35)]',
          cancelButton:
            '!h-9 !rounded-kws-control !bg-[#F1F5F1] !px-3 !text-xs !font-semibold !text-[#192436] hover:!bg-[#E5EBE6] focus-visible:!outline-none focus-visible:!shadow-[0_0_0_2px_rgba(54,181,49,0.35)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
