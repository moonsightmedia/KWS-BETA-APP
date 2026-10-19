import { lazy, Suspense, type ComponentProps } from 'react';

// List/grid views do not need the feed's media and community modules.
const Feed = lazy(() => import('./BoulderVideoFeed').then(module => ({ default: module.BoulderVideoFeed })));

export function BoulderVideoFeed(props: ComponentProps<typeof Feed>) {
  return (
    <Suspense fallback={<div role="status" className="fixed inset-0 z-50 grid place-items-center bg-[#1c2436] text-white">Videos werden geladen …</div>}>
      <Feed {...props} />
    </Suspense>
  );
}
