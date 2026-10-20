import { Video } from 'lucide-react';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBoulderFeedPreferences, type FeedDoubleTapAction } from '@/hooks/useBoulderFeedPreferences';

export default function InteractionSettings() {
  const { doubleTapAction, setDoubleTapAction } = useBoulderFeedPreferences();
  return <DashboardPageLayout headerBackTo="/profile" headerBackLabel="Zurück zu Einstellungen">
    <section className="max-w-2xl" aria-labelledby="video-feed-settings-title">
      <h2 id="video-feed-settings-title" className="mb-3 flex items-center gap-2 text-sm font-semibold"><Video className="h-4 w-4 text-muted-foreground" aria-hidden="true"/>Video-Feed</h2>
      <KwsSurface className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <label id="feed-double-tap-label" htmlFor="feed-double-tap" className="text-sm font-medium">Doppeltipp auf das Video</label>
        <Select value={doubleTapAction} onValueChange={value => setDoubleTapAction(value as FeedDoubleTapAction)}>
          <SelectTrigger id="feed-double-tap" aria-labelledby="feed-double-tap-label" className="sm:w-60 sm:shrink-0"><SelectValue/></SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="off">Aus</SelectItem>
            <SelectItem value="project">Als Projekt speichern</SelectItem>
            <SelectItem value="layout">Layout ausblenden</SelectItem>
          </SelectContent>
        </Select>
      </KwsSurface>
      <p className="mt-3 text-xs text-muted-foreground">Auf diesem Gerät gespeichert.</p>
    </section>
  </DashboardPageLayout>;
}
