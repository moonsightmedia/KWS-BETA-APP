import { createContext, useContext } from 'react';

export interface RouteSwipeController {
  move(element: HTMLElement, path: string | null, delta: number): void;
  finish(path: string | null, delta: number, velocity: number, minimum: number): void;
  cancel(): void;
}

export const RouteSwipeContext = createContext<RouteSwipeController | null>(null);
export const RouteSwipePreviewContext = createContext(false);
export const useRouteSwipePreview = () => useContext(RouteSwipePreviewContext);
