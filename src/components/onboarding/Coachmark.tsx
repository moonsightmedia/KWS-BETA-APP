import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import './onboarding.css';
import { Button } from '@/components/ui/button';
export interface TourStep {
    id: string;
    selector: string;
    title: string;
    text: string;
    action: string;
    account?: boolean;
}
type Geometry = {
    x: number;
    y: number;
    width: number;
    height: number;
    left: number;
    top: number;
    arrow: number;
    docked: boolean;
    radii: number[];
    canvasWidth: number;
    canvasHeight: number;
    side: 'top' | 'bottom' | 'left' | 'right';
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, Math.max(min, max)));
function shadePath(g: Geometry) {
    const { x, y, width: w, height: h, radii: [tl, tr, br, bl] } = g;
    return `M0 0H${g.canvasWidth}V${g.canvasHeight}H0Z M${x + tl} ${y}H${x + w - tr}A${tr} ${tr} 0 0 1 ${x + w} ${y + tr}V${y + h - br}A${br} ${br} 0 0 1 ${x + w - br} ${y + h}H${x + bl}A${bl} ${bl} 0 0 1 ${x} ${y + h - bl}V${y + tl}A${tl} ${tl} 0 0 1 ${x + tl} ${y}Z`;
}
/** Same anchored spotlight approach as TrainingTour. Nonmodal so the real target remains operable. */
export function Coachmark({ step, index, total, onNext, onBack, onClose, portalParent, scrollRoot, progressLabel }: {
    step: TourStep;
    index: number;
    total: number;
    onNext: () => void;
    onBack: () => void;
    onClose: () => void;
    portalParent?: HTMLElement;
    scrollRoot?: HTMLElement;
    progressLabel?: string;
}) {
    const panel = useRef<HTMLDivElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const [geometry, setGeometry] = useState<Geometry | null>(null);
    useLayoutEffect(() => {
        let frame = 0;
        let target: HTMLElement | null = null;
        let dockAligned = false;
        const observer = new ResizeObserver(() => schedule());
        const measure = () => {
            const found = [...document.querySelectorAll<HTMLElement>(step.selector)].find(el => el.getClientRects().length && !el.closest('[inert]'));
            if (!found || !panel.current) {
                setGeometry(null);
                return;
            }
            if (found !== target) {
                if (target)
                    observer.unobserve(target);
                target = found;
                observer.observe(target);
                if (scrollRoot?.contains(target)) {
                    const area = scrollRoot.getBoundingClientRect(), rect = target.getBoundingClientRect();
                    scrollRoot.scrollBy({ top: rect.top + rect.height / 2 - area.top - area.height / 2, behavior: 'instant' });
                }
                else if (!portalParent)
                    target.scrollIntoView({ block: 'center', behavior: 'instant' });
            }
            const view = window.visualViewport;
            const host = portalParent?.getBoundingClientRect();
            const l = host?.left ?? view?.offsetLeft ?? 0, t = host?.top ?? view?.offsetTop ?? 0;
            const w = host?.width ?? view?.width ?? innerWidth, h = host?.height ?? view?.height ?? innerHeight;
            const r = target.getBoundingClientRect(), p = panel.current.getBoundingClientRect();
            const header = target.closest('[data-onboarding-page], [data-guest-surface], [data-boulder-detail-scroll]')?.querySelector('[data-kws-dashboard-header], header');
            const headerBottom = header && !header.contains(target) ? header.getBoundingClientRect().bottom : t;
            const visibleTop = Math.max(t + 8, Math.min(headerBottom + 6, t + h - 8));
            const insideScroll = scrollRoot?.contains(target);
            const scrollBounds = insideScroll ? scrollRoot.getBoundingClientRect() : null;
            const x = clamp(r.left - 5, l + 8, l + w - 8);
            let y = clamp(r.top - 5, Math.max(visibleTop, scrollBounds?.top ?? visibleTop), t + h - 8);
            const width = Math.max(0, Math.min(r.right + 5, l + w - 8) - x);
            let height = Math.max(0, Math.min(r.bottom + 5, scrollBounds?.bottom ?? t + h - 8, t + h - 8) - y);
            const docked = Boolean(scrollBounds && r.height + p.height + 40 > (portalParent ? scrollBounds.height : h - (visibleTop - t)));
            let side: Geometry['side'] = 'bottom';
            if (docked && scrollBounds) {
                const start = Math.max(t + p.height + 28, scrollBounds.top);
                if (!dockAligned) {
                    dockAligned = true;
                    scrollRoot!.scrollBy({ top: r.top - start, behavior: 'instant' });
                    schedule();
                    return;
                }
                if (!portalParent && r.bottom > t + h - 8) {
                    scrollRoot!.scrollBy({ top: r.bottom - (t + h - 8), behavior: 'instant' });
                    schedule();
                    return;
                }
                // A shallow viewport keeps the explanation above a scrollable choice area.
                y = start;
                height = Math.max(0, (portalParent ? scrollBounds.bottom - 4 : Math.min(r.bottom + 5, scrollBounds.bottom)) - y);
                side = 'top';
            }
            else if (x + width + p.width + 28 < l + w)
                side = 'right';
            else if (y - p.height - 16 >= t + 12)
                side = 'top';
            else if (y + height + p.height + 16 > t + h - 12 && height + p.height + 40 < h) {
                const scroller = scrollRoot ?? window;
                const before = scrollRoot ? scrollRoot.scrollTop : window.scrollY;
                scroller?.scrollBy({ top: y + height + p.height + 28 - (t + h), behavior: 'instant' });
                const after = scrollRoot ? scrollRoot.scrollTop : window.scrollY;
                if (after !== before) {
                    schedule();
                    return;
                }
                if (portalParent && scrollRoot?.contains(target)) {
                    scrollRoot.scrollBy({ top: y - (t + p.height + 28), behavior: 'instant' });
                    if (scrollRoot.scrollTop !== before) {
                        schedule();
                        return;
                    }
                }
            }
            const left = clamp(side === 'right' ? x + width + 16 : x + width / 2 - p.width / 2, l + 16, l + w - p.width - 16);
            const top = docked ? t + 12 : clamp(side === 'right' ? y : side === 'top' ? y - p.height - 16 : y + height + 16, t + 12, t + h - p.height - 12);
            const arrow = side === 'right' ? clamp(y + height / 2 - top, 24, p.height - 24) : clamp(x + width / 2 - left, 24, p.width - 24);
            const style = getComputedStyle(target);
            const clippedTop = y > r.top - 4.5, clippedBottom = y + height < r.bottom + 4.5;
            const clippedLeft = x > r.left - 4.5, clippedRight = x + width < r.right + 4.5;
            const radii = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map((value, corner) => {
                const clipped = corner === 0 ? clippedTop || clippedLeft : corner === 1 ? clippedTop || clippedRight : corner === 2 ? clippedBottom || clippedRight : clippedBottom || clippedLeft;
                return clipped ? 0 : Math.min((parseFloat(value) || 0) + 5, width / 2, height / 2);
            });
            setGeometry({ x: x - (host?.left ?? 0), y: y - (host?.top ?? 0), width, height, left: left - (host?.left ?? 0), top: top - (host?.top ?? 0), side, arrow, docked, radii, canvasWidth: host?.width ?? innerWidth, canvasHeight: host?.height ?? innerHeight });
        };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
        if (panel.current)
            observer.observe(panel.current);
        const mutation = new MutationObserver(schedule);
        mutation.observe(portalParent ?? document.getElementById('root')!, { childList: true, subtree: true });
        window.addEventListener('resize', schedule);
        window.addEventListener('scroll', schedule, true);
        window.visualViewport?.addEventListener('resize', schedule);
        window.visualViewport?.addEventListener('scroll', schedule);
        schedule();
        return () => { cancelAnimationFrame(frame); observer.disconnect(); mutation.disconnect(); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true); window.visualViewport?.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('scroll', schedule); };
    }, [step, portalParent, scrollRoot]);
    const g = geometry;
    const positioned = Boolean(g);
    useEffect(() => { if (positioned)
        heading.current?.focus({ preventScroll: true }); }, [positioned]);
    useEffect(() => {
        const handleTab = (event: KeyboardEvent) => {
            if (event.key !== 'Tab')
                return;
            const target = geometry?.docked && scrollRoot && portalParent ? scrollRoot : document.querySelector<HTMLElement>(step.selector);
            const selector = 'button:not(:disabled), a[href], input:not(:disabled), video[controls]';
            const origin = portalParent?.getBoundingClientRect();
            const closeControl = portalParent && !geometry?.docked ? portalParent.querySelector<HTMLElement>('button[aria-label="Filter schließen"]') : null;
            const allowed = [...(closeControl ? [closeControl] : []), ...(target?.matches(selector) ? [target] : []), ...Array.from(target?.querySelectorAll<HTMLElement>(selector) ?? []), ...Array.from(panel.current?.querySelectorAll<HTMLElement>(selector) ?? [])].filter(el => {
                if (!el.getClientRects().length)
                    return false;
                if (!origin || !geometry || panel.current?.contains(el) || el === closeControl)
                    return true;
                const r = el.getBoundingClientRect();
                return r.top >= origin.top + geometry.y - 1 && r.bottom <= origin.top + geometry.y + geometry.height + 1;
            });
            if (!allowed.length)
                return;
            event.preventDefault();
            const current = allowed.indexOf(document.activeElement as HTMLElement);
            allowed[(current + (event.shiftKey ? -1 : 1) + allowed.length) % allowed.length].focus({ preventScroll: true });
        };
        document.addEventListener('keydown', handleTab);
        return () => document.removeEventListener('keydown', handleTab);
    }, [step, geometry, portalParent, scrollRoot]);
    return createPortal(<div className={portalParent ? 'tour-in-filter' : 'tour-layer'} data-tour-docked={g?.docked}><Dialog.Root open modal={false} onOpenChange={open => { if (!open)
        onClose(); }}>
    {g && <>
      {/* One rounded cutout shares its exact contour with the highlight and hit area. */}
      <svg className="tour-shade" aria-hidden="true" viewBox={`0 0 ${g.canvasWidth} ${g.canvasHeight}`} preserveAspectRatio="none"><path d={shadePath(g)} fillRule="evenodd"/></svg>
      <div className="tour-highlight" aria-hidden="true" style={{ left: g.x, top: g.y, width: g.width, height: g.height, borderRadius: g.radii.map(radius => `${radius}px`).join(' ') }}/>
      <span className="tour-arrow" aria-hidden="true" style={g.side === 'right' ? { left: g.left - 6, top: g.top + g.arrow - 6 } : { left: g.left + g.arrow - 6, top: g.side === 'top' ? g.top + (panel.current?.offsetHeight ?? 0) - 6 : g.top - 6 }}/>
    </>}
    <Dialog.Content ref={panel} className="tour-panel" data-coachmark={step.id} data-swipe-ignore aria-describedby="tour-description" onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()} onInteractOutside={event => event.preventDefault()} style={{ left: g?.left ?? 16, top: g?.top ?? 16, visibility: g ? 'visible' : 'hidden' }}>
      <div className="tour-top"><span>{progressLabel ?? `${step.account ? 'Mit Konto' : 'Einführung'} · ${index + 1} von ${total}`}</span><Button variant="ghost" size="icon" aria-label="Einführung schließen" onClick={onClose}><X aria-hidden="true"/></Button></div>
      <Dialog.Title ref={heading} tabIndex={-1} className="tour-title">{step.title}</Dialog.Title>
      <Dialog.Description id="tour-description" className="tour-description">{step.text}</Dialog.Description>
      <div className="tour-actions"><Button variant="ghost" onClick={index ? onBack : onClose}>{index ? 'Zurück' : 'Überspringen'}</Button><Button onClick={onNext}>{step.action}<ArrowRight aria-hidden="true"/></Button></div>
      {index === total - 1 && !portalParent && <Button className="tour-guest" variant="ghost" onClick={onClose}>Als Gast weiter</Button>}
    </Dialog.Content>
  </Dialog.Root></div>, portalParent ?? document.body);
}
