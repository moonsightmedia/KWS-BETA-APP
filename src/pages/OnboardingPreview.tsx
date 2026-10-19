import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Heart, LockKeyhole, Plus, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { BetaLogo } from '@/components/brand/BetaLogo';
import { DifficultyBadge } from '@/components/boulder/DifficultyBadge';
import { BetaPlaceholder } from '@/components/boulder/BetaPlaceholder';
import { WeeklyProgressCard } from '@/components/statistics/WeeklyProgressCard';
import { AccountBenefits } from '@/components/onboarding/AccountBenefits';
import { useOnboarding } from '@/components/onboarding/OnboardingContext';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { FlashIcon } from '@/lib/appIcons';
import { buildPersonalProgress, localDay } from '@/lib/personalProgress';
import { AUTH_REGISTER_PATH } from '@/lib/authRoutes';
import '@/components/onboarding/preview.css';
/** Account actions here are deliberately local state, with no personal read/write hooks. */
export default function OnboardingPreview() {
    const { user, loading } = useAuth();
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const { previewBoulder, closeOnboarding, showBenefits } = useOnboarding();
    const { data: boulders } = useBouldersWithSectors(!loading && !user && pathname === '/onboarding/account');
    const id = new URLSearchParams(search).get('boulder');
    const boulder = previewBoulder ?? boulders?.find(entry => entry.id === id);
    const stats = pathname === '/onboarding/progress';
    const register = pathname === '/onboarding/register';
    const [saved, setSaved] = useState(false);
    const [project, setProject] = useState(false);
    const [result, setResult] = useState('');
    const [attempts, setAttempts] = useState(0);
    const summary = useMemo(() => {
        const now = new Date();
        const topsByDate = [3, 5, 4].map((tops, index) => {
            const date = new Date(now);
            date.setDate(date.getDate() - 5 + index * 2);
            return { date: localDay(date), tops };
        });
        return { ...buildPersonalProgress([], [], { days: 7, now }), tops: 12, flashes: 4, days: 3, topsByDate };
    }, []);
    if (user)
        return <Navigate to="/boulders" replace/>;
    return <DashboardPageLayout headerBackTo="/guest" headerBackLabel="Zurück zur Boulderübersicht" onHeaderBack={closeOnboarding} mainClassName="onboarding-preview">
    <div data-onboarding-page>
      {register ? <div className="register-content"><BetaLogo className="w-32 md:w-44"/>
        <h2>Leg dir ein Konto an</h2><p>Dann kannst du Boulder speichern, Begehungen eintragen und später nachsehen, was du geschafft hast.</p>
        <AccountBenefits />
        <Button asChild><Link to={AUTH_REGISTER_PATH}>Zur Registrierung<ArrowRight aria-hidden="true"/></Link></Button>
        <p>Eigene Konten ab 16 Jahren.</p><Button variant="ghost" onClick={closeOnboarding}>Als Gast weiter</Button>
      </div> : stats ? <>
        <PreviewLabel text="So sieht dein Fortschritt mit Konto aus"/>
        <div data-onboarding="progress" className="progress-preview rounded-kws-card"><WeeklyProgressCard summary={summary}/></div>
        <p className="preview-caption">Eine Beispielwoche, keine Einträge von dir.</p>
        <KwsSurface className="progress-benefits"><h2>Das kannst du mit einem Konto machen</h2><AccountBenefits /><Button onClick={showBenefits}>Konto erstellen<ArrowRight aria-hidden="true"/></Button></KwsSurface>
      </> : <>
        <PreviewLabel text="So nutzt du den Boulder mit Konto"/>
        <div className="boulder-identity"><div><h2>{boulder?.name ?? 'Ein Beispielboulder'}</h2><p>{boulder?.sector ?? 'Hier probierst du die Kontofunktionen aus.'}</p></div>{boulder && <DifficultyBadge difficulty={boulder.difficulty} color={boulder.color} variant="detail"/>}</div>
        <div className="detail-columns">
          <KwsSurface className="detail-media"><div className="media-label">Boulderfoto</div>{boulder?.thumbnailUrl ? <img src={boulder.thumbnailUrl} alt={boulder.name}/> : <div className="aspect-[9/16] max-h-[430px]"><BetaPlaceholder boulderName={boulder?.name ?? 'Beispielboulder'}/></div>}</KwsSurface>
          <div className="detail-information"><KwsSurface className="tracking-content">
            <p className="private-note"><LockKeyhole aria-hidden="true"/>Deine Einträge sind persönlich.</p><h3>Heute</h3>
            <div data-onboarding="tracking" className="tracking-actions">{[
                { value: 'attempt', label: 'Versuch +1', Icon: Plus }, { value: 'top', label: 'Top', Icon: BadgeCheck }, { value: 'flash', label: 'Flash', Icon: FlashIcon },
            ].map(({ value, label, Icon }) => <Button key={value} variant={result === value ? 'default' : 'secondary'} aria-pressed={result === value} onClick={() => { setResult(value); if (value === 'attempt')
                setAttempts(n => n + 1); }}><Icon aria-hidden="true"/>{label}</Button>)}</div>
            <p aria-live="polite" className="preview-feedback">{result ? `${result === 'attempt' ? `${attempts} ${attempts === 1 ? 'Versuch' : 'Versuche'}` : result === 'top' ? 'Top' : 'Flash'} · nur hier in der Vorschau` : 'Du kannst die Buttons hier ausprobieren. Es wird nichts in einem Konto gespeichert.'}</p>
            <h3>Markierungen</h3><div data-onboarding="bookmarks" className="bookmark-actions"><Button variant={saved ? 'default' : 'secondary'} aria-pressed={saved} onClick={() => setSaved(v => !v)}><Heart aria-hidden="true" className={saved ? 'fill-current' : undefined}/>{saved ? 'Gespeichert' : 'Speichern'}</Button><Button variant={project ? 'default' : 'secondary'} aria-pressed={project} onClick={() => setProject(v => !v)}><Target aria-hidden="true"/>Projekt</Button></div>
            <p className="preview-caption">Mit Konto außerdem: eigene Bewertungen, Kommentare und persönliche Notizen.</p>
          </KwsSurface><Button variant="secondary" onClick={() => navigate(`/onboarding/progress${search}`)}>Statistik ansehen<ArrowRight aria-hidden="true"/></Button></div>
        </div>
      </>}
    </div>
  </DashboardPageLayout>;
}
function PreviewLabel({ text }: {
    text: string;
}) {
    return <div className="account-preview-label"><LockKeyhole aria-hidden="true"/><div><strong>Kontovorschau · Beispieldaten</strong><span>{text}. Du bist weiterhin Gast.</span></div></div>;
}
