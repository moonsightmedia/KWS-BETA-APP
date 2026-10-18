import { KwsSurface } from '@/components/ui/kws-surface';
import { CalendarIcon, FlashIcon } from '@/lib/appIcons';
import { localDay, type buildPersonalProgress } from '@/lib/personalProgress';
import './weekly-progress-card.css';

type ProgressSummary = ReturnType<typeof buildPersonalProgress>;
const number = (value: number) => value.toLocaleString('de-DE');
const dayDate = (day: string) => new Date(`${day}T12:00:00`);
const dateLabel = (day: string) => dayDate(day).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

/** Reserve the loaded card's geometry without implying any values or activity. */
export function WeeklyProgressSkeleton() {
  return <KwsSurface className="weekly-progress-card weekly-progress-skeleton" data-testid="weekly-progress-skeleton" role="status" aria-busy="true">
    <span className="sr-only">Dein Fortschritt wird geladen …</span>
    <div aria-hidden="true">
      <div className="weekly-progress-heading"><span>Deine Woche</span><span className="weekly-placeholder weekly-placeholder-date" /></div>
      <div className="weekly-progress-body">
        <div className="weekly-progress-total"><strong><span className="weekly-placeholder weekly-placeholder-total" /></strong><span><span className="weekly-placeholder weekly-placeholder-label" /></span></div>
        <div className="weekly-progress-chart">
          <div className="weekly-placeholder-caption"><span className="weekly-placeholder" /></div>
          <div className="weekly-progress-days">{Array.from({ length: 7 }, (_, index) => <div className="weekly-progress-day" key={index}>
            <div className="weekly-progress-track"><span className="weekly-placeholder weekly-placeholder-bar" /></div>
            <span className="weekly-progress-day-label"><span className="weekly-placeholder weekly-placeholder-day" /></span>
          </div>)}</div>
        </div>
      </div>
      <div className="weekly-progress-footer"><span><span className="weekly-placeholder weekly-placeholder-footer" /></span><span><span className="weekly-placeholder weekly-placeholder-footer-short" /></span></div>
    </div>
  </KwsSurface>;
}

/** Seven local calendar days ending today, matching Home's statistics link. */
export function WeeklyProgressCard({ summary }: { summary: ProgressSummary }) {
  const topsByDate = new Map(summary.topsByDate.map(day => [day.date, day.tops]));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = dayDate(summary.today);
    date.setDate(date.getDate() - 6 + index);
    const key = localDay(date);
    return { date: key, label: date.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', ''), tops: topsByDate.get(key) ?? 0 };
  });
  const maximum = Math.max(1, ...days.map(day => day.tops));
  const chartDescription = days.map(day => `${dateLabel(day.date)}: ${number(day.tops)}`).join(', ');

  return <KwsSurface className="weekly-progress-card" data-testid="weekly-progress-card">
    <div className="weekly-progress-heading"><span>Deine Woche</span><span>{dateLabel(days[0].date)} – {dateLabel(summary.today)}</span></div>
    <div className="weekly-progress-body">
      <div className="weekly-progress-total"><strong data-metric="weekly-tops" data-wide={summary.tops >= 1000}>{number(summary.tops)}</strong><span>Boulder geschafft</span></div>
      <figure className="weekly-progress-chart" aria-label={`Geschaffte Boulder pro Tag. ${chartDescription}. Jeder Boulder zählt im Zeitraum einmal, am ersten erfolgreichen Tag.`}>
        <figcaption>Tops pro Tag</figcaption>
        <div className="weekly-progress-days" aria-hidden="true">{days.map(day => <div className="weekly-progress-day" key={day.date}>
          <div className="weekly-progress-track">{day.tops > 0 ? <span className="weekly-progress-count">{number(day.tops)}</span> : null}<span className={day.tops ? 'weekly-progress-bar' : 'weekly-progress-bar weekly-progress-zero'} style={{ height: day.tops ? `${day.tops / maximum * 48}px` : '3px' }} /></div>
          <span className="weekly-progress-day-label">{day.label}</span>
        </div>)}</div>
      </figure>
    </div>
    <div className="weekly-progress-footer">
      <span><FlashIcon aria-hidden="true"/><span><strong data-metric="weekly-flashes">{number(summary.flashes)}</strong> davon als Flash</span></span>
      <span><CalendarIcon aria-hidden="true"/><span><strong data-metric="weekly-days">{number(summary.days)}</strong> {summary.days === 1 ? 'Klettertag' : 'Klettertage'}</span></span>
    </div>
    {summary.tops === 0 ? <p className="weekly-progress-empty">{summary.days ? 'Deine Versuche zählen. Deine nächsten Tops erscheinen hier.' : 'Deine nächsten Tops erscheinen hier.'}</p> : null}
  </KwsSurface>;
}
