import { BetaLogo } from '@/components/brand/BetaLogo';

/** Place inside a `relative isolate` page surface, behind its opaque content. */
export function BrandWatermark() {
  return (
    <div aria-hidden="true" data-brand-watermark className="pointer-events-none absolute inset-0 -z-10 overflow-clip">
      <div className="sticky top-[50dvh] flex h-0 items-center justify-center">
        <BetaLogo variant="symbol" decorative className="h-auto w-[22rem] max-w-[90%] opacity-[0.08] md:w-[30rem]" />
      </div>
    </div>
  );
}
