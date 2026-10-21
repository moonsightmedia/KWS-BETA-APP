import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetterBoulderEditorDialog, createEmptySetterBoulderDraft, type SetterBoulderDraft } from '@/components/setter/SetterBoulderEditorDialog';
import { saveBoulderThumbnail } from '@/lib/editableThumbnail';
import { fixtureSectors } from './admin-hallmap-hooks';
import { Button } from '@/components/ui/button';
import '@/index.css';
const colors = [{ id: 'green', name: 'Grün', hex: '#36B531' }, { id: 'pink', name: 'Rosa', hex: '#dd72ad' }];
const id = '03a06939-cbe7-48e0-94f6-23620ba301e1';
const thumbnailUrl = `https://beta-api.kletterwelt-sauerland.de/storage/v1/object/public/beta-videos/thumbnail-focus/confirmed-2026-10-20/${id}-11d6c01908492a81a9a9.png`;
const state = window as unknown as { thumbnailUploads: unknown[]; thumbnailDraft: SetterBoulderDraft };
state.thumbnailUploads = [];
function Fixture() {
  const [draft, setDraft] = useState<SetterBoulderDraft>(() => ({ ...createEmptySetterBoulderDraft(colors), id, name: 'Beispielboulder', withoutVideo: true, difficulty: 3, sectorId: fixtureSectors[0].id, existingThumbnailUrl: thumbnailUrl }));
  const [open, setOpen] = useState(true), [saved, setSaved] = useState('');
  state.thumbnailDraft = draft;
  const close = (next: boolean) => { setOpen(next); if (!next) setDraft(d => ({ ...d, thumbFile: null, thumbnailFocus: undefined, thumbnailSource: undefined })); };
  const submit = async () => {
    const nextUrl = await saveBoulderThumbnail(draft, colors.find(c => c.id === draft.colorId)!.name, null);
    setDraft(d => ({ ...d, existingThumbnailUrl: nextUrl || d.existingThumbnailUrl, thumbFile: null, thumbnailFocus: undefined, thumbnailSource: undefined }));
    setSaved('Boulder gespeichert'); setOpen(false);
  };
  return <><p className="p-4 text-sm">Isolierte Prüfung · gezeichnete Beispieldaten</p><Button onClick={() => setOpen(true)}>Boulder bearbeiten</Button>
    <SetterBoulderEditorDialog open={open} onOpenChange={close} title="Boulder bearbeiten" submitLabel="Speichern" draft={draft} onDraftChange={setDraft} colors={colors} sectors={fixtureSectors} attributeCatalog={[]} onSubmit={submit} />
    <output data-fixture-result>{saved}</output></>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Fixture /></QueryClientProvider>);
