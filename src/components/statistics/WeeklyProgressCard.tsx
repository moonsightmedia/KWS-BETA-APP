import { KwsSurface } from '@/components/ui/kws-surface';
import { CalendarIcon, FlashIcon } from '@/lib/appIcons';
import { localDay, type buildPersonalProgress } from '@/lib/personalProgress';
import './weekly-progress-card.css';

type ProgressSummary = ReturnType<typeof buildPersonalProgress>;
const number = (value: number) => value.toLocaleString('de-DE');
const dayDate = (day: string) => new Date(`${day}T12:00:00`);
const dateLabel = (day: string) => dayDate(day).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

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
