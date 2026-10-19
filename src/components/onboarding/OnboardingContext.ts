import { createContext, useContext } from 'react';
import type { Boulder } from '@/types/boulder';
export interface GuestTourSurface {
    ready: boolean;
    boulder?: Boulder;
    filtersOpen: boolean;
    openFilters: () => void;
}
export interface OnboardingContextValue {
    isOpen: boolean;
    openOnboarding: () => void;
    closeOnboarding: () => void;
    showAccountPreview: () => void;
    showBenefits: () => void;
    previewBoulder?: Boulder;
    reportGuest: (surface: GuestTourSurface | null) => void;
    reportDetail: (boulder: Boulder | null) => void;
    reportFilterHost: (host: HTMLDivElement | null) => void;
    confirmFilters: () => void;
}
const noop = () => { };
export const OnboardingContext = createContext<OnboardingContextValue>({
    isOpen: false, openOnboarding: noop, closeOnboarding: noop,
    showAccountPreview: noop, showBenefits: noop, reportGuest: noop,
    reportDetail: noop, reportFilterHost: noop, confirmFilters: noop,
});
export const useOnboarding = () => useContext(OnboardingContext);
