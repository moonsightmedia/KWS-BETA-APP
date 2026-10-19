import { Check, Pause, Play, Repeat2, RotateCcw, RotateCw } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { useBoulderVideoControls } from '@/hooks/useBoulderVideoControls';

type Props = {
  controls: ReturnType<typeof useBoulderVideoControls>;
  fullscreenContainer: HTMLDivElement | null;
};
const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
const speedLabel = (value: number) => `${String(value).replace('.', ',')}×`;

export function BoulderVideoControls({ controls: c, fullscreenContainer }: Props) {
  return <>
    <div className="kws-video-center kws-video-chrome" ref={element => { if (element) element.inert = !c.visible; }}>
      <Button variant="secondary" size="icon" aria-label="5 Sekunden zurück" disabled={!c.duration} onClick={() => c.skip(-5)}><span className="kws-video-skip" aria-hidden="true"><RotateCcw /><span>5</span></span></Button>
      <Button className="kws-video-play" aria-label={c.playing ? 'Video pausieren' : 'Video abspielen'} onClick={c.togglePlayback}>{c.playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</Button>
      <Button variant="secondary" size="icon" aria-label="5 Sekunden vor" disabled={!c.duration} onClick={() => c.skip(5)}><span className="kws-video-skip" aria-hidden="true"><RotateCw /><span>5</span></span></Button>
    </div>
    <div className="kws-video-dock kws-video-chrome" ref={element => { if (element) element.inert = !c.visible; }}>
      <div className="kws-video-seek">
        <input type="range" aria-label="Videoposition" aria-valuetext={`${formatTime(c.time)} von ${formatTime(c.duration)}`} min={0} max={c.duration || 1} step={0.05} value={c.time} disabled={!c.duration}
          style={{ '--video-progress': `${c.duration ? Math.min(100, c.time / c.duration * 100) : 0}%` } as CSSProperties}
          onPointerDown={event => { if (event.button === 0) c.beginScrub(); }}
          onChange={event => c.seek(Number(event.currentTarget.value))}
          onPointerUp={() => c.finishScrub()} onPointerCancel={() => c.finishScrub(true)} onLostPointerCapture={() => c.finishScrub()} onBlur={() => c.finishScrub()}
          onKeyDown={event => { if (event.key === 'Escape' && c.scrubbing) { event.preventDefault(); event.stopPropagation(); c.finishScrub(true); } }} />
        <span><b>{formatTime(c.time)}</b> / {c.duration ? formatTime(c.duration) : '–:––'}</span>
      </div>
      <div className="kws-video-tools">
        <Button variant="ghost" size="icon" aria-label={c.playing ? 'Pause' : 'Abspielen'} disabled={!c.duration} onClick={c.togglePlayback}>{c.playing ? <Pause /> : <Play />}</Button>
        <Button variant="ghost" size="icon" aria-label="Von vorne abspielen" disabled={!c.duration} onClick={c.restart}><RotateCcw /></Button>
        <div className="kws-video-tools-end">
          <DropdownMenu open={c.menuOpen} onOpenChange={c.setMenuOpen}>
            <DropdownMenuTrigger asChild><Button variant="secondary" className="kws-video-speed" aria-label={`Geschwindigkeit: ${speedLabel(c.speed)}`}>{speedLabel(c.speed)}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" portalContainer={fullscreenContainer} collisionPadding={12} className="kws-video-speed-menu">
              <DropdownMenuLabel>Geschwindigkeit</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={String(c.speed)} onValueChange={value => { c.setSpeed(Number(value)); c.reveal(); }}>
                {[0.25, 0.5, 0.75, 1].map(value => <DropdownMenuRadioItem key={value} value={String(value)} className="kws-video-speed-option"><Check aria-hidden="true" className={c.speed === value ? '' : 'invisible'} /><span>{speedLabel(value)}</span><small>{value === 1 ? 'Normal' : value === .25 ? 'Sehr langsam' : 'Zeitlupe'}</small></DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant={c.loop ? 'default' : 'secondary'} className="kws-video-loop" aria-label="Video wiederholen" aria-pressed={c.loop} onClick={() => { c.setLoop(!c.loop); c.reveal(); }}><Repeat2 />Loop</Button>
        </div>
      </div>
    </div>
    {c.blocked && <p className="kws-video-blocked" role="status">Tippe auf Play, um zu starten.</p>}
  </>;
}
