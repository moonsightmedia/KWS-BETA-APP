import { useId } from "react";
import { cn } from "@/lib/utils";

/** Shared local animation: no video request, upload, spinner or fake controls. */
export function BetaPlaceholder({ thumbnailUrl, boulderName, className }: {
  thumbnailUrl?: string;
  boulderName: string;
  className?: string;
}) {
  const illustrationId = useId().replace(/:/g, "");
  return (
    <div className={cn("beta-placeholder flex h-full w-full flex-col items-center justify-center gap-4 bg-secondary px-5 py-6 text-center text-foreground", className)}
      data-beta-placeholder>
      <div className="relative w-full max-w-[272px] shrink-0">
        <svg viewBox="0 0 320 240" className="block h-48 w-full" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id={`${illustrationId}-wall`} x1="185" y1="34" x2="288" y2="211" gradientUnits="userSpaceOnUse">
              <stop className="[stop-color:hsl(var(--card))]" />
              <stop offset="1" className="[stop-color:hsl(var(--secondary))]" />
            </linearGradient>
          </defs>
          {/* A quiet architectural wall, not a decorative background blob. */}
          <path d="M198 30h62l34 164-25 23H169Z" className="fill-foreground/[0.07]" transform="translate(4 3)" />
          <path d="M198 30h62l34 164-25 23H169Z" fill={`url(#${illustrationId}-wall)`} stroke="currentColor" strokeOpacity=".10" />
          <path d="m260 30 34 164-25 23-9-4 25-21Z" className="fill-foreground/[0.06]" />
          <path d="m198 30-29 187 8-5 28-180Z" className="fill-card" />
          <g className="fill-foreground/15">
            {[62, 98, 134, 170].map(y => <g key={y}><circle cx="219" cy={y} r="1.3" /><circle cx="253" cy={y} r="1.3" /></g>)}
          </g>
          {/* Holds have their own facets and bolt, rather than generic dots. */}
          <g transform="translate(241 44)">
            <path d="m-14 4 7-13 15-2 12 9-4 11-19 4Z" className="fill-primary-ink/20" transform="translate(0 3)" />
            <path d="m-14 4 7-13 15-2 12 9-4 11-19 4Z" className="fill-primary" />
            <path d="m-7-9 15-2-2 8-20 7Z" className="fill-card/25" />
            <circle cx="4" cy="3" r="2" className="fill-primary-ink" />
          </g>
          <path d="m198 127 11-6 13 5-4 10-14 3Z" className="fill-primary/30" />
          <circle cx="211" cy="130" r="1.5" className="fill-primary-ink/50" />
          <path d="m238 177 13-5 8 8-6 7-15-2Z" className="fill-foreground/15" />
          <circle cx="248" cy="181" r="1.5" className="fill-foreground/30" />
          {/* Crash mat with a stitched seam, shallow extrusion and contact shadow. */}
          <ellipse cx="173" cy="225" rx="104" ry="6" className="fill-foreground/[0.06]" />
          <path d="m77 207 172-5 29 15-8 10-172 4-21-14Z" className="fill-foreground/20" />
          <path d="m77 207 172-5 29 15-172 6Z" className="fill-card" />
          <path d="m106 223 172-6-8 10-164 4Z" className="fill-foreground/10" />
          <path d="m173 205 24 16" stroke="currentColor" strokeOpacity=".12" strokeWidth="1.3" />
          <path d="m77 207 29 16v8l-21-7-8-7Z" className="fill-foreground/25" />
          <g className="beta-placeholder-climber">
            {/* Chalk bag and a bent back arm stay behind the torso. */}
            <path d="m142 127-17 17-12-15" stroke="hsl(var(--beta-skin))" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m143 126-12 13" stroke="hsl(var(--primary-ink))" strokeWidth="15" strokeLinecap="round" />
            <path d="m125 155-11 4 3 18 16-2 2-15Z" className="fill-card" stroke="currentColor" strokeOpacity=".2" />
            <path d="m117 162 15-2" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" />
            <g className="beta-placeholder-back-leg">
              <path d="m145 158-5 23-13 17" stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m120 193-5 8c-2 3 0 5 4 5h17v-6l-8-7Z" className="fill-foreground" />
              <path d="M119 204h17" className="stroke-card/60" strokeWidth="2" strokeLinecap="round" />
            </g>
            <path d="m157 157 20 17-5 24" stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m166 194-2 10c0 3 2 4 5 4h18c2 0 3-3 0-5l-10-7Z" className="fill-foreground" />
            <path d="M169 207h17" className="stroke-card/60" strokeWidth="2" strokeLinecap="round" />
            <path d="m146 119-13 8-4 31c10 9 26 10 38 1l-6-30-7-10Z" className="fill-primary" />
            <path d="m139 132-5 23c6 5 11 7 20 7" stroke="hsl(var(--primary-ink))" strokeOpacity=".28" strokeWidth="5" strokeLinecap="round" />
            <path d="m151 146 8 3" className="stroke-card/50" strokeWidth="2" strokeLinecap="round" />
            <g className="beta-placeholder-reaching-arm">
              <path d="m159 130 23-19 20-22" stroke="hsl(var(--beta-skin))" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m159 130 11-9" stroke="hsl(var(--primary))" strokeWidth="17" strokeLinecap="round" />
              <path d="m200 91 5-9 4 2-2 10" fill="hsl(var(--beta-skin))" />
              <path d="m180 113 21-22" stroke="hsl(var(--beta-skin-shadow))" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g className="beta-placeholder-head">
              <path d="m149 110-2 12c4 5 9 6 14 1l-3-13Z" fill="hsl(var(--beta-skin-shadow))" />
              <path d="M143 101c-1-10 4-18 14-18 10 0 17 7 16 18l4 5-5 2c-2 11-6 14-14 12-9-2-15-8-15-19Z" fill="hsl(var(--beta-skin))" />
              <path d="M142 102c-6-12 0-23 13-24 10-1 17 5 20 13-9 4-18 0-22-4l-3 17Z" className="fill-foreground" />
              <path d="m149 84 8-3 7 3" className="stroke-card/15" strokeWidth="2" strokeLinecap="round" />
              <ellipse cx="147" cy="105" rx="3" ry="4" fill="hsl(var(--beta-skin))" />
              <circle cx="167" cy="101" r="1.7" className="fill-foreground" />
              <path d="m163 112 5 1" stroke="currentColor" strokeOpacity=".65" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          </g>
          <g className="beta-placeholder-miss" stroke="currentColor" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round">
            <path d="m209 47-5-6m4 14h-7m14-14v-7" />
          </g>
        </svg>
      </div>
      <div className="max-w-xs">
        <p className="text-base font-semibold leading-6">Hier waren wir noch zu schwach.</p>
        <p className="mt-2 text-sm text-muted-foreground">Beta folgt. Du kannst dich schon mal versuchen.</p>
      </div>
      {thumbnailUrl && (
        <div className="flex max-w-full items-center gap-3 rounded-kws-control bg-card px-3 py-2 text-left">
          <img src={thumbnailUrl} alt={`Startgriffe von ${boulderName}`} className="h-12 w-12 shrink-0 rounded-kws-badge object-cover" />
          <span className="text-xs font-medium">Deine Startgriffe</span>
        </div>
      )}
    </div>
  );
}
