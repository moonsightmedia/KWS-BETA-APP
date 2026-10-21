import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { Check, ChevronDown, ChevronLeft, Expand, Eye, ImagePlus, MousePointer2, PencilLine, RotateCcw, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BetaLogo } from '@/components/brand/BetaLogo';
import { colors, contourArea, initialDraft, photo, polygon, readSaved, selectedCount, storageKey, type Draft, type Point } from './model';

type Tool = 'tap' | 'trace';
type CanvasProps = { draft: Draft; tool: Tool; original: boolean; disabled: boolean; onToggle: (id: string) => void; onContour: (points: Point[]) => void; onDrawing: (drawing: boolean) => void; onMessage: (message: string) => void };

export function HoldCanvas({ draft, tool, original, disabled, onToggle, onContour, onDrawing, onMessage }: CanvasProps) {
  const mask = useId().replace(/:/g, '');
  const surface = useRef<SVGSVGElement>(null);
  const stroke = useRef<Point[]>([]);
  const activePointer = useRef<number | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [drawing, setDrawing] = useState(false);
  const chosen = draft.holds.filter(h => draft.selected.includes(h.id));
  const faded = !original && !draft.volume && chosen.length > 0;
  const position = (event: PointerEvent<SVGSVGElement>): Point => {
    const svg = surface.current!, point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const mapped = point.matrixTransform(svg.getScreenCTM()!.inverse());
    return [Math.max(0, Math.min(360, mapped.x)), Math.max(0, Math.min(480, mapped.y))];
  };
  const cancel = () => { activePointer.current = null; stroke.current = []; setPoints([]); setDrawing(false); onDrawing(false); };
  useEffect(() => {
    if (!drawing) return;
    const escape = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; event.preventDefault(); event.stopPropagation(); activePointer.current = null; stroke.current = []; setPoints([]); setDrawing(false); onDrawing(false); };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [drawing, onDrawing]);
  const finish = () => {
    const path = stroke.current;
    cancel();
    if (path.length >= 3 && contourArea(path) > 35) onContour(path);
    else onMessage('Die Kontur war zu klein. Zeichne einmal um den Griff herum.');
  };
  return <svg ref={surface} className={`hold-photo ${tool === 'trace' ? 'is-tracing' : ''}`} viewBox="0 0 360 480" aria-label="Vorschaubild mit direkt bearbeitbarer Griffauswahl"
    onPointerDown={event => {
      if (disabled || tool !== 'trace' || original || draft.volume || event.button !== 0 || activePointer.current !== null) return;
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      activePointer.current = event.pointerId;
      stroke.current = [position(event)]; setPoints(stroke.current); setDrawing(true); onDrawing(true);
    }}
    onPointerMove={event => {
      if (activePointer.current !== event.pointerId || !stroke.current.length) return;
      const next = position(event), previous = stroke.current.at(-1)!;
      if (Math.hypot(next[0] - previous[0], next[1] - previous[1]) < 2 || stroke.current.length >= 512) return;
      stroke.current = [...stroke.current, next]; setPoints(stroke.current);
    }}
    onPointerUp={event => { if (activePointer.current !== event.pointerId) return; finish(); }}
    onPointerCancel={cancel} onLostPointerCapture={() => { if (activePointer.current !== null) cancel(); }}
    onKeyDown={event => { if (event.key === 'Escape' && drawing) { event.stopPropagation(); cancel(); } }}>
    <defs><mask id={mask}><rect width="360" height="480" fill="black" />{chosen.map(h => <polygon key={h.id} points={polygon(h.points)} fill="white" />)}</mask></defs>
    <image href={draft.photo} width="360" height="480" preserveAspectRatio="none" className={faded ? 'photo-muted' : ''} />
    {faded && <image href={draft.photo} width="360" height="480" preserveAspectRatio="none" mask={`url(#${mask})`} />}
    {!original && !draft.volume && draft.holds.map((hold, index) => {
      const active = draft.selected.includes(hold.id);
      const [x, y] = hold.points.reduce((p, next) => [p[0] + next[0] / hold.points.length, p[1] + next[1] / hold.points.length], [0, 0]);
      return <g key={hold.id} className="hold-region">
        <polygon points={polygon(hold.points)} className={`hold-hit ${active ? 'is-selected' : ''}`} role="button" tabIndex={!disabled && tool === 'tap' ? 0 : -1} aria-disabled={disabled}
          aria-label={`Griff ${index + 1}${hold.manual ? ' – eigene Kontur' : ''}`} aria-pressed={active}
          onClick={event => { event.stopPropagation(); if (!disabled && tool === 'tap') onToggle(hold.id); }}
          onKeyDown={event => { if (!disabled && tool === 'tap' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onToggle(hold.id); } }} />
        {active && <g className="hold-check" aria-hidden="true" transform={`translate(${x - 8},${y - 8})`}><rect width="16" height="16" rx="4" /><path d="m4 8 3 3 5-6" /></g>}
      </g>;
    })}
    {drawing && <polyline className="trace-line" points={polygon(points)} />}
    {drawing && points.length > 0 && <circle cx={points[0][0]} cy={points[0][1]} r="4" fill="white" stroke="#192436" strokeWidth="2" />}
  </svg>;
}

export function Prototype() {
  const [mode, setMode] = useState<'create' | 'edit'>('edit');
  const [saved, setSaved] = useState(readSaved);
  const [draft, setDraft] = useState(readSaved);
  const baseline = useRef(JSON.stringify(draft));
  const history = useRef<Draft[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [historyCount, setHistoryCount] = useState(0);
  const [tool, setTool] = useState<Tool>('tap');
  const [original, setOriginal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const pendingAction = useRef<() => void>(() => {});
  const generation = useRef<ReturnType<typeof setTimeout>>();
  const nameInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draft) !== baseline.current;
  const count = selectedCount(draft);
  const update = (change: Partial<Draft>) => { setDraft(previous => ({ ...previous, ...change })); setMessage(''); setError(''); };
  const remember = () => { history.current = [...history.current.slice(-29), draft]; setHistoryCount(history.current.length); };
  const toggle = (id: string) => { remember(); update({ selected: draft.selected.includes(id) ? draft.selected.filter(x => x !== id) : [...draft.selected, id] }); };
  const addContour = (points: Point[]) => {
    remember(); const id = `contour-${crypto.randomUUID()}`;
    update({ holds: [...draft.holds, { id, color: draft.color, points, manual: true }], selected: [...draft.selected, id] });
    setTool('tap'); setMessage('Kontur ergänzt.');
  };
  const resetTransient = () => { history.current = []; setHistoryCount(0); setTool('tap'); setOriginal(false); setError(''); setMessage(''); setGenerating(false); clearTimeout(generation.current); };
  const requestAction = (action: () => void) => { if (dirty) { pendingAction.current = action; setDiscard(true); } else action(); };
  const switchMode = (next: 'create' | 'edit') => {
    if (next === mode) return;
    requestAction(() => { const nextDraft = next === 'edit' ? saved : initialDraft(false); setMode(next); setDraft(nextDraft); baseline.current = JSON.stringify(nextDraft); resetTransient(); });
  };
  const chooseColor = (color: string) => {
    if (color === draft.color) return;
    remember(); clearTimeout(generation.current);
    // Color proposals are prepared example data. Stored editing geometry never
    // reruns analysis on opening, switching modes or returning to the editor.
    const selected = draft.holds.filter(h => h.color === color).slice(0, 2).map(h => h.id);
    update({ color, selected }); setGenerating(true);
    generation.current = setTimeout(() => setGenerating(false), 450);
  };
  const undo = () => { const previous = history.current.pop(); if (!previous) return; clearTimeout(generation.current); setGenerating(false); setDraft(previous); setHistoryCount(history.current.length); setMessage('Letzte Bildänderung zurückgenommen.'); setError(''); };
  const save = () => {
    if (drawing || generating || saving) return;
    if (!draft.name.trim()) { setError('Gib dem Boulder einen Namen.'); nameInput.current?.focus(); return; }
    setSaving(true); setError('');
    // Visible local-only transaction simulation. No requests or backend client.
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const next = { ...draft, name: draft.name.trim() };
      try {
        localStorage.setItem(storageKey, JSON.stringify({ schema: 1, draft: next }));
        setSaved(next); setDraft(next); setMode('edit'); baseline.current = JSON.stringify(next); resetTransient();
        setMessage('Lokal gespeichert – Boulder und Griffauswahl.');
      } catch { setError('Der Browser konnte nicht lokal speichern. Deine Änderungen bleiben geöffnet.'); }
      setSaving(false);
    }, 350);
  };
  const replacePhoto = async (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12_000_000) { setError('Bitte JPG, PNG oder WebP bis 12 MB auswählen.'); return; }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 480;
      const ctx = canvas.getContext('2d')!; const scale = Math.min(360 / image.naturalWidth, 480 / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 360, 480); ctx.drawImage(image, (360 - width) / 2, (480 - height) / 2, width, height);
      remember(); update({ photo: canvas.toDataURL('image/jpeg', .9), holds: [], selected: [] }); setTool('trace');
      setMessage('Eigenes Foto: Kontur lokal zeichnen. Die automatische Erkennung ist in diesem Entwurf ein vorbereitetes Beispiel.');
    } catch { setError('Das Foto konnte nicht geöffnet werden. Wähle ein anderes Foto.'); }
    finally { URL.revokeObjectURL(url); if (fileInput.current) fileInput.current.value = ''; }
  };
  const canvasProps: CanvasProps = { draft, tool, original, disabled: saving || generating, onToggle: toggle, onContour: addContour, onDrawing: setDrawing, onMessage: setMessage };
  const toolbar = <div className="thumbnail-toolbar">
    <div className="tools" role="group" aria-label="Bildwerkzeug">
      <Button type="button" variant={tool === 'tap' ? 'secondary' : 'ghost'} aria-pressed={tool === 'tap'} disabled={drawing || draft.volume || original} onClick={() => setTool('tap')}><MousePointer2 />Antippen</Button>
      <Button type="button" variant={tool === 'trace' ? 'secondary' : 'ghost'} aria-pressed={tool === 'trace'} disabled={drawing || draft.volume || original} onClick={() => setTool('trace')}><PencilLine />Kontur</Button>
    </div>
    <div className="tools">
      <Button type="button" size="icon" variant="ghost" disabled={!historyCount || drawing} aria-label="Bildänderung rückgängig" title="Rückgängig" onClick={undo}><Undo2 /></Button>
      <Button type="button" size="icon" variant={original ? 'secondary' : 'ghost'} aria-label={original ? 'Griffauswahl anzeigen' : 'Original anzeigen'} aria-pressed={original} title="Mit Original vergleichen" disabled={drawing} onClick={() => setOriginal(!original)}><Eye /></Button>
    </div>
  </div>;

  return <div className="thumbnail-ux">
    <div className="prototype-bar"><div><BetaLogo className="prototype-logo" /><span>Lokaler Entwurf</span></div><span className="prototype-disclaimer">Beispieldaten · nur auf diesem Gerät</span></div>
    <main className="prototype-main">
      <div className="prototype-context"><span>Schrauben / Boulder</span><span>Entwurf 01</span></div>
      <KwsSegmentedControl value={mode} onValueChange={switchMode} ariaLabel="Erstellen oder Bearbeiten ausprobieren" options={[{ value: 'create', label: 'Erstellen' }, { value: 'edit', label: 'Bearbeiten' }]} className="mode-switch" />
      <form className="editor-surface" onSubmit={event => { event.preventDefault(); save(); }} aria-label={mode === 'edit' ? 'Boulder bearbeiten' : 'Boulder erstellen'}>
        <header className="editor-heading"><div><h1>{mode === 'edit' ? 'Boulder bearbeiten' : 'Boulder hinzufügen'}</h1><p className="draft-state">{saving ? 'Wird lokal gespeichert …' : dirty || mode === 'create' ? 'Ungespeichert' : <><Check />Gespeicherte Version</>}</p></div><Button type="button" variant="ghost" size="icon" aria-label="Entwurf zurücksetzen" title="Entwurf zurücksetzen" disabled={saving || drawing} onClick={() => requestAction(() => { const next = mode === 'edit' ? saved : initialDraft(false); setDraft(next); baseline.current = JSON.stringify(next); resetTransient(); })}><RotateCcw /></Button></header>
        <fieldset disabled={saving} className="editor-fields">
          <div className="metadata-row"><div><Label htmlFor="boulder-name">Name</Label><Input id="boulder-name" ref={nameInput} value={draft.name} placeholder="Boulder benennen" onChange={event => update({ name: event.target.value })} aria-invalid={!!error && !draft.name.trim()} aria-describedby={error && !draft.name.trim() ? 'name-error' : undefined} />{error && !draft.name.trim() && <p id="name-error" role="alert" className="field-error">{error}</p>}</div><div><Label htmlFor="boulder-sector">Sektor</Label><Select value={draft.sector} onValueChange={sector => update({ sector })}><SelectTrigger id="boulder-sector"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Grotte A">Grotte A</SelectItem><SelectItem value="Bug B">Bug B</SelectItem><SelectItem value="Top-Out A">Top-Out A</SelectItem></SelectContent></Select></div></div>
          <section className="color-section" aria-label="Grifffarbe"><div className="section-heading"><h2>Grifffarbe</h2><label className="volume-control" htmlFor="volume">Nur Volumen<Switch id="volume" checked={draft.volume} disabled={drawing} onCheckedChange={volume => update({ volume })} /></label></div><div className="color-options">{colors.map(color => <button type="button" key={color.id} aria-pressed={draft.color === color.id} disabled={drawing} className={`color-choice ${draft.color === color.id ? 'chosen' : ''}`} onClick={() => chooseColor(color.id)}><span className="color-swatch" style={{ background: color.hex }} />{color.name}{draft.color === color.id && <Check />}</button>)}</div></section>
          <section className="inline-thumbnail" aria-label="Vorschaubild direkt bearbeiten" data-selected-count={count} data-dirty={dirty}>
            <div className="section-heading"><h2>Vorschaubild</h2><span className="selection-status" role="status">{generating ? 'Auswahl wird angepasst …' : draft.volume ? 'Original · Nur Volumen' : `${count} ${count === 1 ? 'Griff' : 'Griffe'} ausgewählt`}</span></div>
            {toolbar}
            <div className="photo-stage"><HoldCanvas {...canvasProps} /><Button type="button" size="icon" variant="secondary" className="expand-photo" aria-label="Bild vergrößern" disabled={drawing} onClick={() => setExpanded(true)}><Expand /></Button></div>
            <p className="image-help">{original ? 'Originalfoto zum Vergleichen.' : draft.volume ? 'Das Original bleibt ohne Griffmarkierungen erhalten.' : tool === 'trace' ? 'Am Griffrand entlang zeichnen und loslassen.' : 'Griffe im Bild antippen, um sie an- oder abzuwählen.'}</p>
            {!count && !draft.volume && <p className="empty-selection">Keine Griffe ausgewählt. Gespeichert wird das Originalfoto.</p>}
            <div className="photo-meta"><span>{draft.photo === photo ? mode === 'create' ? 'Automatisch vorbereitet' : dirty ? 'Auswahl angepasst' : 'Gespeicherte Auswahl geladen' : 'Eigenes Foto · manuelle Auswahl'}</span><Button type="button" variant="ghost" disabled={drawing} onClick={() => fileInput.current?.click()}><ImagePlus />Foto ersetzen</Button></div>
            <input ref={fileInput} className="sr-only" aria-label="Eigenes Boulderfoto wählen" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void replacePhoto(event.target.files?.[0])} />
            <details className="keyboard-alternative"><summary>Griffe einzeln auswählen</summary><div>{draft.holds.map((h, i) => <Button key={h.id} variant={draft.selected.includes(h.id) ? 'default' : 'secondary'} type="button" aria-pressed={draft.selected.includes(h.id)} disabled={draft.volume || drawing} onClick={() => toggle(h.id)}>{draft.selected.includes(h.id) && <Check />}Griff {i + 1}</Button>)}</div></details>
          </section>
          <section className="grade-section"><h2>Schwierigkeit</h2><div className="grade-options">{[1,2,3,4,5,6,7,8].map(grade => <button type="button" key={grade} aria-label={`Schwierigkeit ${grade}`} aria-pressed={draft.grade === grade} className={draft.grade === grade ? 'active' : ''} onClick={() => update({ grade })}>{grade}</button>)}</div></section>
          <details className="optional-fields"><summary>Weitere Angaben <ChevronDown /></summary><Label htmlFor="local-note">Notiz für diese Vorschau</Label><Input id="local-note" placeholder="Optional" value={draft.note || ''} onChange={event => update({note: event.target.value})} /></details>
        </fieldset>
        {error && draft.name.trim() && <p className="editor-error" role="alert">{error}</p>}
        {message && <p className="editor-message" role="status">{message}</p>}
        <footer className="editor-footer"><Button type="button" variant="secondary" disabled={saving || drawing} onClick={() => requestAction(() => { setDraft(saved); baseline.current = JSON.stringify(saved); setMode('edit'); resetTransient(); })}>Abbrechen</Button><Button type="submit" disabled={saving || generating || drawing}>{saving ? 'Wird gespeichert …' : mode === 'create' ? 'Boulder hinzufügen' : 'Speichern'}{!saving && <Check />}</Button></footer>
      </form>
      <p className="local-only">Speichern gilt nur für diese lokale Vorschau. Foto, Auswahl und Korrekturen bleiben hier zusammen erhalten.</p>
    </main>
    <Dialog open={expanded} onOpenChange={open => { if (!drawing) setExpanded(open); }}><DialogContent scrollLayout="contained" className="zoom-dialog" onEscapeKeyDown={event => { if (drawing) event.preventDefault(); }}><div className="zoom-heading"><div><DialogTitle>Griffauswahl</DialogTitle><DialogDescription>Direkt korrigieren. Änderungen werden mit dem Boulder gespeichert.</DialogDescription></div><Button type="button" size="icon" variant="ghost" aria-label="Große Bildansicht schließen" disabled={drawing} onClick={() => setExpanded(false)}><X /></Button></div>{toolbar}<div className="zoom-stage"><HoldCanvas {...canvasProps} /></div><p className="image-help">{tool === 'trace' ? 'Am Griffrand entlang zeichnen und loslassen.' : 'Griffe antippen zum An- oder Abwählen.'}</p></DialogContent></Dialog>
    <Dialog open={discard} onOpenChange={setDiscard}><DialogContent className="discard-dialog"><DialogTitle>Änderungen verwerfen?</DialogTitle><DialogDescription>Deine Änderungen an Boulder und Bild wurden noch nicht gespeichert.</DialogDescription><div><Button type="button" variant="secondary" onClick={() => setDiscard(false)}><ChevronLeft />Weiter bearbeiten</Button><Button type="button" onClick={() => { setDiscard(false); pendingAction.current(); }}>Verwerfen</Button></div></DialogContent></Dialog>
  </div>;
}
