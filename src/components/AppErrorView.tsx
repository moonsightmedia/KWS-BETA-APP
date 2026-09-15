import { useEffect, useRef, type ReactNode } from 'react';
import { BoulderIcon } from '@/components/icons/BoulderIcon';

/** Router-independent: also usable when the app's provider tree has crashed. */
export function AppErrorView({ code, title, description, children, embedded = false }: { code: string; title: string; description: string; children: ReactNode; embedded?: boolean }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return <main className={(embedded ? 'relative pb-28 md:pb-8 ' : 'fixed inset-0 z-40 overflow-y-auto pb-[max(2rem,env(safe-area-inset-bottom))] ') + 'bg-background px-5 pt-[max(2rem,env(safe-area-inset-top))] text-foreground'}>
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col">
      <a href="/" aria-label="Kletterwelt Sauerland – Startseite" className="flex w-fit items-center gap-3 rounded-kws-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        <img src="/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png" alt="" className="h-12 w-12 object-contain" />
        <span className="text-sm font-semibold">Kletterwelt Sauerland<span className="block text-xs font-normal text-muted-foreground">Beta App</span></span>
      </a>
      <section className="my-auto grid gap-8 py-12 xl:grid-cols-[1fr_1.2fr] xl:items-center xl:gap-16">
        <div aria-hidden="true" className="relative flex items-center gap-5 md:justify-center">
          <div className="grid h-20 w-20 place-items-center rounded-kws-card bg-secondary md:h-36 md:w-36"><BoulderIcon className="h-12 w-12 text-muted-foreground md:h-20 md:w-20" strokeWidth={1.5} /></div>
          <span className="font-heading text-7xl leading-none tracking-tight text-foreground md:absolute md:-bottom-9 md:right-3 md:text-8xl">{code}</span>
        </div>
        <div className="max-w-lg space-y-5"><h1 ref={headingRef} tabIndex={-1} className="font-heading text-4xl leading-tight outline-none sm:text-5xl">{title}</h1><p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p><div className="space-y-3">{children}</div></div>
      </section>
    </div>
  </main>;
}
