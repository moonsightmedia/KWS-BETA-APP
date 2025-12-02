import { useMemo, useRef, useState } from 'react';
import {
  CloudUpload,
  Plus,
  Video,
  Trash2,
  Image,
  X,
  Save,
  Zap,
} from 'lucide-react';
import { ToastError, ToastSuccess } from '../../../components/ui/Toast';

type DraftBoulder = {
  id: string;
  name: string;
  difficulty: number | null;
  color: string | null;
  sector: string | null;
  note: string;
  tags: string[];
  setters: string[];
  thumbnailUrl?: string; // preview URL
  thumbnailFile?: File | null;
  videoFile?: File | null;
  videoUrl?: string; // preview URL
  createdAt: number;
};

export function UploadView() {
  const [open, setOpen] = useState(false);

  // Batch queue
  const [drafts, setDrafts] = useState<DraftBoulder[]>([]);
  const pendingCount = drafts.length;

  // Local toast state
  const [toast, setToast] = useState<null | { type: 'ok' | 'err'; msg: string }>(null);
  const showToast = (t: { type: 'ok' | 'err'; msg: string }) => {
    setToast(t);
    setTimeout(() => setToast(null), 2500);
  };

  // Form state for modal
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<number | null>(4);
  const [color, setColor] = useState<string | null>('#5681EA');
  const [sector, setSector] = useState<string | null>('Sektor B');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [setters, setSetters] = useState<string[]>(['Alex']);
  const [setterInput, setSetterInput] = useState('');
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Refs to trigger file pickers from placeholder frames
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const thumbUrl = useMemo(() => (thumbFile ? URL.createObjectURL(thumbFile) : undefined), [thumbFile]);
  const videoUrl = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : undefined), [videoFile]);

  const addTagFromInput = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const addSetterFromInput = () => {
    const s = setterInput.trim();
    if (!s) return;
    if (!setters.includes(s)) setSetters([...setters, s]);
    setSetterInput('');
  };

  const resetForm = () => {
    setName('');
    setDifficulty(4);
    setColor('#5681EA');
    setSector('Sektor B');
    setNote('');
    setTags([]);
    setSetters([]);
    setThumbFile(null);
    setVideoFile(null);
  };

  const randomName = () => {
    const A = ['Black', 'Silent', 'Electric', 'Green', 'Flying', 'Hidden', 'Cosmic', 'Granite', 'Spicy', 'Royal'];
    const B = ['Tiger', 'Roof', 'Slab', 'Dyno', 'Crimp', 'Arete', 'Cave', 'Edge', 'Flow', 'Wave'];
    return `${A[Math.floor(Math.random() * A.length)]} ${B[Math.floor(Math.random() * B.length)]}`;
  };

  const addToQueue = () => {
    const draft: DraftBoulder = {
      id: Math.random().toString(36).slice(2),
      name: name || randomName(),
      difficulty,
      color,
      sector,
      note,
      tags,
      setters,
      thumbnailUrl: thumbUrl,
      thumbnailFile: thumbFile,
      videoFile,
      videoUrl,
      createdAt: Date.now(),
    };
    setDrafts((d) => [draft, ...d]);
    setOpen(false);
    showToast({ type: 'ok', msg: 'Zur Upload‑Warteschlange hinzugefügt.' });
    resetForm();
  };

  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id));

  const [uploading, setUploading] = useState(false);
  const uploadAll = async () => {
    if (!drafts.length || uploading) return;
    setUploading(true);
    try {
      // TODO: Replace with real API call
      await new Promise((r) => setTimeout(r, 1200));
      setDrafts([]);
      showToast({ type: 'ok', msg: 'Alle Boulder erfolgreich hochgeladen.' });
    } catch (e) {
      showToast({ type: 'err', msg: 'Upload fehlgeschlagen.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="view-section fade-in h-full flex flex-col relative pb-24">
      {/* Header */}
      <div className="border-b border-[#E7F7E9] pb-6 flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-3xl font-semibold tracking-wide text-[#13112B]">UPLOAD QUEUE</h2>
          <span className="bg-[#E7F7E9] text-[#36B531] text-xs font-bold px-2 py-1 rounded-md">
            {pendingCount} PENDING
          </span>
        </div>
        <p className="text-base text-[#13112B]/60">Deine erstellten Boulder warten auf den Upload.</p>
      </div>

      {/* Grid Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drafts.length === 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 text-sm text-[#13112B]/50">
            Noch keine Boulder in der Warteschlange. Mit dem grünen Plus unten rechts hinzufügen.
          </div>
        )}

        {drafts.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-[#E7F7E9] p-4 rounded-2xl shadow-sm flex items-center gap-4 group hover:border-[#36B531]/50 transition-colors"
          >
            <div className="w-16 aspect-[9/16] rounded-xl bg-gray-100 flex-shrink-0 relative overflow-hidden">
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} className="w-full h-full object-cover" />
              ) : item.videoUrl ? (
                <video
                  src={item.videoUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  loop
                  autoPlay
                />
              ) : (
                <div className="absolute inset-0 bg-[#36B531]/10 flex items-center justify-center">
                  <Image className="w-6 h-6 text-[#36B531]" strokeWidth={1.5} />
                </div>
              )}
              {item.videoFile && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <Video className="w-6 h-6 text-white drop-shadow-md" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-heading text-xl font-medium text-[#13112B] truncate">{item.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                {item.color && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />}
                <span className="text-sm text-[#13112B]/50 font-medium">{item.sector ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {item.difficulty != null && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold border border-gray-200">
                    {item.difficulty}
                  </span>
                )}
                <span className="text-[10px] text-[#36B531] font-bold uppercase tracking-wide">Ready</span>
              </div>
            </div>
            <button className="p-2 text-gray-300 hover:text-red-500 transition-colors" onClick={() => removeDraft(item.id)}>
              <Trash2 className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      {/* FABs Container */}
      <div className="fixed z-30 bottom-24 right-4 lg:bottom-12 lg:right-12 flex items-center gap-4">
        {/* Upload All FAB */}
        <button
          onClick={uploadAll}
          disabled={!pendingCount || uploading}
          className="h-14 px-6 bg-white text-[#13112B] rounded-2xl shadow-xl shadow-black/5 flex items-center gap-3 transition-all active:scale-95 hover:scale-105 border border-[#E7F7E9] group disabled:opacity-60 disabled:hover:scale-100"
        >
          <span className="text-sm font-bold uppercase tracking-wide group-hover:text-[#36B531] transition-colors">
            {uploading ? 'Uploading…' : 'Upload All'}
          </span>
          <CloudUpload className="w-5 h-5 text-[#36B531]" strokeWidth={1.5} />
        </button>

        {/* Add New FAB */}
        <button onClick={() => setOpen(true)} className="w-16 h-16 bg-[#36B531] active:bg-[#2da029] text-white rounded-2xl shadow-xl shadow-[#36B531]/30 flex items-center justify-center transition-all active:scale-95 hover:scale-105 hover:shadow-2xl hover:shadow-[#36B531]/40 border border-white/20">
          <Plus className="w-8 h-8" strokeWidth={1.5} />
        </button>
      </div>

      {/* Toasts */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[110]">
          {toast.type === 'ok' ? (
            <ToastSuccess>{toast.msg}</ToastSuccess>
          ) : (
            <ToastError>{toast.msg}</ToastError>
          )}
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 pb-safe">
          {/* Backdrop */}
          <button onClick={() => setOpen(false)} className="fixed inset-0 bg-[#13112B]/30 backdrop-blur-sm transition-opacity" aria-hidden="true" />

          {/* Modal Content */}
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-[#13112B]/5 overflow-hidden flex flex-col max-h-[90vh] modal-enter text-sm">
            {/* Handle for Mobile Drag */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-12 h-1.5 bg-[#E7F7E9] rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-6 pt-4 pb-2 relative flex items-center justify-center text-center">
              <div>
                <h3 className="font-heading text-2xl font-semibold text-[#13112B] tracking-tight">Neuer Boulder</h3>
                <p className="text-xs text-[#13112B]/60 mt-1">Erstelle einen neuen Boulder. Lade Video und Thumbnail hoch.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 text-[#13112B]/40 hover:text-[#13112B] rounded-xl hover:bg-[#F9FAF9] transition-colors absolute right-4 top-3"
                aria-label="Dialog schließen"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-3.5 overflow-y-auto space-y-6 no-scrollbar">
              {/* Section: Media */}
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="sr-only">Thumbnail</span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={thumbInputRef}
                    onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Thumbnail auswählen"
                    onClick={() => thumbInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        thumbInputRef.current?.click();
                      }
                    }}
                    className="mt-2 w-full aspect-[9/16] rounded-xl border border-dashed border-[#E7F7E9] overflow-hidden bg-[#F9FAF9] relative cursor-pointer hover:border-[#36B531]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531] focus-visible:ring-offset-2"
                    title="Thumbnail wählen"
                  >
                    {thumbUrl ? (
                      <img src={thumbUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4">
                        <Image className="w-7 h-7 text-[#13112B]/40" strokeWidth={1.5} />
                        <span className="text-xs text-[#13112B]/60">Thumbnail</span>
                      </div>
                    )}
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="sr-only">Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    ref={videoInputRef}
                    onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  <>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Video auswählen"
                      onClick={() => videoInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          videoInputRef.current?.click();
                        }
                      }}
                      className="mt-2 w-full aspect-[9/16] rounded-xl border border-dashed border-[#E7F7E9] overflow-hidden relative bg-[#F9FAF9] cursor-pointer hover:border-[#36B531]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531] focus-visible:ring-offset-2"
                      title="Video wählen"
                    >
                      {videoUrl ? (
                        <video
                          src={videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          loop
                          autoPlay
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4">
                          <Video className="w-7 h-7 text-[#13112B]/40" strokeWidth={1.5} />
                          <span className="text-xs text-[#13112B]/60">Video</span>
                        </div>
                      )}
                    </div>
                    {videoFile && (
                      <div className="text-xs text-[#13112B]/60 truncate mt-1">{videoFile.name}</div>
                    )}
                  </>
                </label>
              </div>

              {/* Section: Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#13112B]">Name (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Boulder-Name eingeben..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-[#F9FAF9] border border-[#E7F7E9] rounded-2xl text-sm focus:bg-white focus:outline-none focus:border-[#36B531] focus:ring-1 focus:ring-[#36B531] transition-all text-[#13112B] placeholder-[#13112B]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setName(randomName())}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center border border-[#E7F7E9] rounded-2xl text-[#13112B]/60 hover:text-[#36B531] hover:border-[#36B531] bg-white transition-all"
                  >
                    <Zap className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Section: Difficulty (1-8 Grid) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#13112B]">Schwierigkeit (Optional)</label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                    <label key={n} className="cursor-pointer relative group">
                      <input
                        type="radio"
                        name="difficulty"
                        className="radio-grade hidden"
                        checked={difficulty === n}
                        onChange={() => setDifficulty(n)}
                      />
                      <div
                        className={`w-full aspect-[4/3] flex items-center justify-center bg-white border rounded-2xl text-base font-semibold text-[#13112B] group-hover:border-[#36B531]/50 transition-all ${
                          difficulty === n ? 'border-[#36B531]' : 'border-[#E7F7E9]'
                        }`}
                      >
                        {n}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section: Color (Dots) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#13112B]">Farbe (Optional)</label>
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
                  {[
                    '#69B54A',
                    '#5681EA',
                    '#D65448',
                    '#ECD348',
                    '#E08636',
                    '#8E44ED',
                    '#1F1E31',
                    'white',
                  ].map((c, idx) => (
                    <label key={c} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        className="radio-color hidden"
                        checked={color === c || (c === 'white' && color === 'white')}
                        onChange={() => setColor(c)}
                      />
                      <div
                        className={`w-9 h-9 rounded-full ring-offset-2 ${
                          color === c ? 'ring-2 ring-[#36B531]' : ''
                        } ${c === 'white' ? 'bg-white border border-gray-200' : ''}`}
                        style={c !== 'white' ? { backgroundColor: c } : undefined}
                      ></div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section: Sector (Horizontal Scroll) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#13112B]">Sektor (Optional)</label>
                <div className="flex gap-2 overflow-x-auto snap-scroll no-scrollbar pb-2">
                  {['Sektor A', 'Sektor B', 'Sektor C', 'Cave', 'Roof', 'Slab'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSector(s)}
                      className={`snap-child shrink-0 px-5 py-2.5 rounded-2xl text-sm font-medium transition-colors border ${
                        sector === s
                          ? 'bg-[#36B531] text-white border-[#36B531] shadow-lg shadow-[#36B531]/20'
                          : 'bg-[#F9FAF9] hover:bg-[#E7F7E9] hover:text-[#36B531] border-[#E7F7E9]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section: Tags */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#13112B]">Tags</label>
                <div className="w-full px-2 py-2 bg-[#F9FAF9] border border-[#E7F7E9] rounded-2xl flex flex-wrap items-center gap-2 min-h-[48px] focus-within:bg-white focus-within:border-[#36B531] focus-within:ring-1 focus-within:ring-[#36B531] transition-all">
                  {tags.map((t) => (
                    <div key={t} className="flex items-center gap-1 bg-white border border-[#E7F7E9] px-3 py-1.5 rounded-xl">
                      <span className="text-sm font-medium text-[#13112B]">{t}</span>
                      <button
                        onClick={() => setTags((all) => all.filter((x) => x !== t))}
                        className="text-[#13112B]/40 hover:text-red-500"
                      >
                        <X className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTagFromInput())}
                    placeholder="Tag eingeben und Enter drücken..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-[#13112B] min-w-[150px] placeholder-[#13112B]/30 px-2"
                  />
                  <button
                    type="button"
                    onClick={() => (tags.includes('technisch') ? null : setTags([...tags, 'technisch']))}
                    className="px-3 py-1.5 text-xs bg-white border border-[#E7F7E9] rounded-xl text-[#13112B]/80"
                  >
                    + technisch
                  </button>
                </div>
              </div>

              {/* Section: Note */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#13112B]">Notiz</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Besondere Hinweise, Beta, usw."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#F9FAF9] border border-[#E7F7E9] rounded-2xl text-sm focus:bg-white focus:outline-none focus:border-[#36B531] focus:ring-1 focus:ring-[#36B531] transition-all text-[#13112B] placeholder-[#13112B]/30"
                />
              </div>

              {/* Section: Setter (Tag Input Look) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#13112B]">Routenschrauber (Optional)</label>
                <div className="w-full px-2 py-2 bg-[#F9FAF9] border border-[#E7F7E9] rounded-2xl flex flex-wrap items-center gap-2 min-h-[48px] focus-within:bg-white focus-within:border-[#36B531] focus-within:ring-1 focus-within:ring-[#36B531] transition-all cursor-text">
                  {setters.map((s) => (
                    <div key={s} className="flex items-center gap-1 bg-white border border-[#E7F7E9] px-3 py-1.5 rounded-xl">
                      <span className="text-sm font-medium text-[#13112B]">{s}</span>
                      <button onClick={() => setSetters((all) => all.filter((x) => x !== s))} className="text-[#13112B]/40 hover:text-red-500">
                        <X className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    value={setterInput}
                    onChange={(e) => setSetterInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSetterFromInput())}
                    placeholder="Name eingeben und Enter drücken..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-[#13112B] min-w-[120px] placeholder-[#13112B]/30 px-2"
                  />
                </div>
              </div>

              <div className="h-6" />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#E7F7E9] bg-white flex gap-3 pb-safe-plus z-10">
              <button onClick={() => setOpen(false)} className="flex-1 py-3.5 px-4 rounded-xl bg-white border border-[#E7F7E9] text-[#13112B] text-sm font-semibold active:scale-95 transition-all">
                Abbrechen
              </button>
              <button
                onClick={addToQueue}
                className="flex-[2] py-3.5 px-4 rounded-xl bg-[#36B531] text-white text-sm font-semibold shadow-lg shadow-[#36B531]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" strokeWidth={1.5} />
                Zur Queue hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadView;
