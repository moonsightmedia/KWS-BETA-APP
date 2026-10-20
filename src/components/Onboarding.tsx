import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { boulderNavigationState } from '@/lib/boulderNavigation';
import { backendStorageKey } from '@/lib/backendConfig';
import type { Boulder } from '@/types/boulder';
import { Coachmark } from './onboarding/Coachmark';
import { filterResultStep, filterSteps, steps } from './onboarding/steps';
import { OnboardingContext, type GuestTourSurface } from './onboarding/OnboardingContext';
// Keep the existing import API for consumers outside this feature.
// eslint-disable-next-line react-refresh/only-export-components
export { useOnboarding } from './onboarding/OnboardingContext';
const seenKey = () => backendStorageKey('kws-onboarding-v1');
function hasSeen() {
    try {
        return Boolean(localStorage.getItem(seenKey()) || localStorage.getItem(backendStorageKey('hasSeenOnboarding')));
    }
    catch {
        return false;
    }
}
function remember() {
    try {
        localStorage.setItem(seenKey(), 'seen');
    }
    catch { /* The provider also remembers completion for this session. */ }
}
function hasBetaVideo(boulder?: Boulder | null) {
    return Boolean(boulder?.betaVideoUrl || boulder?.betaVideoUrls?.hd || boulder?.betaVideoUrls?.sd || boulder?.betaVideoUrls?.low);
}
export function OnboardingProvider({ children }: {
    children: ReactNode;
}) {
    const { user, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [index, setIndex] = useState<number | null>(null);
    const [guest, setGuest] = useState<GuestTourSurface | null>(null);
    const [detail, setDetail] = useState<Boulder | null>(null);
    const lastVisitedBoulder = useRef<Boulder | null>(null);
    const [previewBoulder, setPreviewBoulder] = useState<Boulder>();
    const [filterHost, setFilterHost] = useState<HTMLDivElement | null>(null);
    const [filterStage, setFilterStage] = useState(0);
    const [filterResults, setFilterResults] = useState(false);
    const [initiallySeen] = useState(hasSeen);
    const finished = useRef(initiallySeen);
    const started = useRef(false);
    const returnFocus = useRef<HTMLElement | null>(null);
    const guestRoute = useRef('/guest');
    const filtersWereOpen = useRef(false);
    const filtersConfirmed = useRef(false);
    const pendingRoute = useRef<string | null>(null);
    const originScroll = useRef(0);
    const restoreGuestScroll = useRef(false);
    const isGuest = location.pathname === '/guest';
    const isDetail = /^\/boulders\/[^/]+$/.test(location.pathname);
    const isPreview = location.pathname.startsWith('/onboarding/');
    const reportGuest = useCallback((surface: GuestTourSurface | null) => setGuest(surface), []);
    const reportDetail = useCallback((boulder: Boulder | null) => {
        if (boulder) lastVisitedBoulder.current = boulder;
        setDetail(boulder);
    }, []);
    const reportFilterHost = useCallback((host: HTMLDivElement | null) => setFilterHost(host), []);
    const confirmFilters = useCallback(() => { filtersConfirmed.current = true; }, []);
    const close = useCallback(() => {
        remember();
        finished.current = true;
        pendingRoute.current = null;
        setIndex(null);
        setFilterResults(false);
        restoreGuestScroll.current = location.pathname === '/guest' || location.pathname.startsWith('/onboarding/');
        if (location.pathname.startsWith('/onboarding/'))
            navigate(guestRoute.current, { replace: true });
        requestAnimationFrame(() => {
            const filterTarget = document.querySelector<HTMLElement>('[data-onboarding=filter-dialog] button');
            const fallback = document.querySelector<HTMLElement>('[data-boulder-detail-scroll] button, [data-onboarding=replay]');
            const trigger = returnFocus.current;
            (filterTarget ?? (trigger?.isConnected && trigger.getClientRects().length && !trigger.closest('[inert]') ? trigger : fallback))?.focus({ preventScroll: true });
        });
    }, [location.pathname, navigate]);
    const go = useCallback((next: number) => {
        pendingRoute.current = next === 0 || next === 2 ? '/guest' : next === 1 ? '/boulders/' : next === 5 ? '/onboarding/progress' : '/onboarding/account';
        setFilterResults(false);
        setFilterStage(0);
        setIndex(next);
        if (next === 0 || next === 2) {
            if (isDetail)
                navigate(-1);
            else if (!isGuest)
                navigate(guestRoute.current);
        }
        else if (next === 1) {
            const target = document.querySelector<HTMLButtonElement>('[data-onboarding=discover]');
            if (target) target.click();
            else if (lastVisitedBoulder.current) navigate(`/boulders/${lastVisitedBoulder.current.id}`, { state: boulderNavigationState(location) });
            else { pendingRoute.current = null; setIndex(2); }
        }
        else {
            setPreviewBoulder(current => current ?? detail ?? guest?.boulder ?? lastVisitedBoulder.current ?? undefined);
            const boulder = detail ?? guest?.boulder ?? previewBoulder ?? lastVisitedBoulder.current;
            const suffix = boulder ? `?boulder=${encodeURIComponent(boulder.id)}` : '';
            navigate(`/onboarding/${next === 5 ? 'progress' : 'account'}${suffix}`);
        }
    }, [isDetail, isGuest, navigate, detail, guest?.boulder, previewBoulder, location]);
    const openOnboarding = useCallback(() => {
        if (user || loading)
            return;
        started.current = true;
        originScroll.current = window.scrollY;
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setPreviewBoulder(undefined);
        go(0);
    }, [user, loading, go]);
    const showAccountPreview = useCallback(() => {
        originScroll.current = window.scrollY;
        setPreviewBoulder(detail ?? guest?.boulder);
        go(3);
    }, [detail, guest?.boulder, go]);
    const showBenefits = useCallback(() => {
        remember();
        finished.current = true;
        setIndex(null);
        navigate('/onboarding/register');
    }, [navigate]);
    useEffect(() => {
        if (isGuest)
            guestRoute.current = location.pathname + location.search;
        if (!loading && !user && isGuest && guest?.ready && guest.boulder && !finished.current && !started.current) {
            started.current = true;
            originScroll.current = window.scrollY;
            setIndex(0);
        }
    }, [loading, user, isGuest, guest, location.pathname, location.search]);
    useEffect(() => {
        if (index !== null || !isGuest || !restoreGuestScroll.current) return;
        const frame = requestAnimationFrame(() => {
            window.scrollTo({ top: originScroll.current, behavior: 'instant' });
            document.querySelector<HTMLElement>('[data-onboarding=replay]')?.focus({ preventScroll: true });
            restoreGuestScroll.current = false;
        });
        return () => cancelAnimationFrame(frame);
    }, [index, isGuest]);

    // Navigation and the loaded surface determine the explanation. Auth never auto-opens it.
    useEffect(() => {
        if (index === null)
            return;
        if (user || (!isGuest && !isDetail && !isPreview)) {
            close();
            return;
        }
        // Browser history navigation resolves on a later task; do not overwrite its intended step.
        if (pendingRoute.current && !location.pathname.startsWith(pendingRoute.current))
            return;
        pendingRoute.current = null;
        if (isDetail && detail && (index === 0 || index === 2))
            setIndex(1);
        else if (isGuest && index === 1)
            setIndex(0);
        else if (isGuest && index >= 3)
            close();
        else if (location.pathname === '/onboarding/account' && index === 5)
            setIndex(4);
        else if (location.pathname === '/onboarding/progress' && index < 5)
            setIndex(5);
    }, [index, user, isGuest, isDetail, isPreview, detail, location.pathname, close]);
    useEffect(() => {
        if (index !== 2 || !isGuest) {
            filtersWereOpen.current = false;
            return;
        }
        if (guest?.filtersOpen) {
            if (!filtersWereOpen.current) {
                setFilterStage(0);
                filtersConfirmed.current = false;
                setFilterResults(false);
            }
            filtersWereOpen.current = true;
        }
        else if (filtersWereOpen.current) {
            filtersWereOpen.current = false;
            setFilterResults(filtersConfirmed.current);
        }
    }, [index, isGuest, guest?.filtersOpen]);
    const next = () => {
        if (index === 2) {
            if (filterResults)
                go(3);
            else
                guest?.openFilters();
        }
        else if (index === 5)
            showBenefits();
        else if (index !== null)
            go(index + 1);
    };
    const baseStep = index === null ? null : steps[index];
    const step = baseStep?.id === 'beta' && !hasBetaVideo(detail) ? {
        ...baseStep, title: 'So erkennst du den Boulder',
        text: 'Hier siehst du den Boulder an der Wand. Für diesen gibt es noch kein Beta-Video. Wenn eines dabei ist, kannst du es auch ohne Konto ansehen.',
    } : baseStep;
    const surfaceReady = index === 0 ? isGuest && guest?.ready && guest.boulder
        : index === 1 ? isDetail && detail
            : index === 2 ? isGuest && guest?.ready
                : index === 5 ? location.pathname === '/onboarding/progress'
                    : location.pathname === '/onboarding/account';
    const inFilter = index === 2 && guest?.filtersOpen;
    const tourVisible = Boolean(step && surfaceReady);
    const value = useMemo(() => ({
        isOpen: tourVisible, openOnboarding, closeOnboarding: close,
        showAccountPreview, showBenefits, previewBoulder,
        reportGuest, reportDetail, reportFilterHost, confirmFilters,
    }), [tourVisible, openOnboarding, close, showAccountPreview, showBenefits, previewBoulder, reportGuest, reportDetail, reportFilterHost, confirmFilters]);
    return <OnboardingContext.Provider value={value}>
    {children}
    {step && surfaceReady && !inFilter && <Coachmark key={filterResults ? filterResultStep.id : step.id} scrollRoot={index === 1 ? document.querySelector<HTMLElement>('[data-boulder-detail-scroll]') ?? undefined : undefined} step={filterResults ? filterResultStep : step} index={index!} total={steps.length} onNext={next} onBack={() => filterResults ? setFilterResults(false) : go(index! - 1)} onClose={close}/>}
    {step && surfaceReady && inFilter && filterHost && <Coachmark key={filterSteps[filterStage].id} step={filterSteps[filterStage]} index={index!} total={steps.length} progressLabel={`Filter · ${filterStage + 1} von ${filterSteps.length}`} portalParent={filterHost} scrollRoot={filterHost.querySelector<HTMLElement>('[data-filter-scroll]') ?? undefined} onNext={() => {
                if (filterStage < filterSteps.length - 1)
                    setFilterStage(stage => stage + 1);
                else
                    filterHost.querySelector<HTMLButtonElement>('[data-onboarding=filter-show]')?.click();
            }} onBack={() => {
                if (filterStage)
                    setFilterStage(stage => stage - 1);
                else
                    filterHost.querySelector<HTMLButtonElement>('button[aria-label="Filter schließen"]')?.click();
            }} onClose={close}/>}
  </OnboardingContext.Provider>;
}
export const Onboarding = () => <OnboardingProvider>{null}</OnboardingProvider>;
