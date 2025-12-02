import {
  ToggleLeft,
  Layout as LayoutIcon,
  Wrench,
  Loader,
  Search,
  ChevronDown,
  Plus,
  CameraOff,
  CheckCircle2,
  MoreHorizontal,
  GripVertical,
  QrCode,
  Edit,
  Edit2,
  Video,
  AlertCircle,
  Check,
  Inbox,
} from 'lucide-react';
import { TextInput, SearchInput, TextArea, DateInput } from '../../../components/ui/Input';
import { PrimaryButton, SecondaryButton, IconButton } from '../../../components/ui/Button';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import { FilterChip } from '../../../components/ui/Chip';
import DropdownMock from '../../../components/ui/Dropdown';
import { ToastSuccess, ToastError } from '../../../components/ui/Toast';
import SkeletonBlock from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';

export function SystemView() {
  return (
    <div className="view-section fade-in space-y-16 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-[#E7F7E9] pb-6">
        <h2 className="font-heading text-4xl font-semibold tracking-wide text-[#13112B]">SYSTEM KOMPONENTEN</h2>
        <p className="text-sm text-[#13112B]/60">Eine Übersicht aller UI-Elemente für User, Setter und Admins.</p>
      </div>

      {/* SECTION: INTERACTIONS & INPUTS */}
      <div className="space-y-6">
        <h3 className="font-heading text-2xl text-[#13112B] flex items-center gap-2">
          <ToggleLeft className="w-5 h-5" strokeWidth={1.5} /> Interaktionen &amp; Inputs
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs Column */}
          <div className="space-y-4">
            {/* Standard Text */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Textfeld</label>
              <TextInput placeholder="Beispiel Text..." />
            </div>

            {/* Search */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Suche</label>
              <SearchInput placeholder="Suchen..." />
            </div>

            {/* Text Area */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Mehrzeilig (Notiz)</label>
              <TextArea rows={3} placeholder="Notiz eingeben..." />
            </div>

            {/* Date Picker */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Datum</label>
              <DateInput />
            </div>
          </div>

          {/* Controls Column */}
          <div className="space-y-6">
            {/* Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Buttons</label>
              <div className="flex flex-wrap gap-3">
                <PrimaryButton>Primary</PrimaryButton>
                <SecondaryButton>Secondary</SecondaryButton>
                <IconButton>
                  <Plus className="w-5 h-5" strokeWidth={1.5} />
                </IconButton>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Toggle Switch</label>
              <div className="flex items-center justify-between bg-white p-3 border border-[#E7F7E9] rounded-xl">
                <span className="text-sm font-medium">Status Aktiv</span>
                <ToggleSwitch defaultChecked />
              </div>
            </div>

            {/* Chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Filter &amp; Sort Chips</label>
              <div className="flex flex-wrap gap-2">
                <FilterChip activeDark>Alle</FilterChip>
                <FilterChip>Sektor A</FilterChip>
                <FilterChip withChevron>Schwer</FilterChip>
              </div>
            </div>

            {/* Dropdown Simulation */}
            <div className="space-y-2 relative z-10">
              <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Dropdown / Select</label>
              <DropdownMock />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: CARDS */}
      <div className="space-y-6">
        <h3 className="font-heading text-2xl text-[#13112B] flex items-center gap-2">
          <LayoutIcon className="w-5 h-5" strokeWidth={1.5} /> Cards &amp; Views
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Boulder Card */}
          <div className="bg-white border border-[#E7F7E9] p-4 rounded-2xl shadow-sm flex items-center gap-4 group">
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 relative overflow-hidden">
              <img src="https://images.unsplash.com/photo-1522163182402-834f871fd851?w=150&h=150&fit=crop" className="w-full h-full object-cover" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#5681EA] rounded-full border border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-heading text-xl font-medium text-[#13112B] truncate">Blue Roof V1</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#13112B]/50 font-medium">Sektor Cave</span>
                <span className="text-xs text-[#13112B]/30">•</span>
                <span className="text-xs text-[#13112B]/50">Set by Alex</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold border border-gray-200">5B</span>
              <CheckCircle2 className="w-4 h-4 text-[#36B531]" strokeWidth={1.5} />
            </div>
          </div>

          {/* Draft Card */}
          <div className="bg-white border border-dashed border-[#13112B]/20 p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2 py-1 bg-[#E08636] text-white text-[10px] font-bold rounded-bl-lg">DRAFT</div>
            <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <CameraOff className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-heading text-xl font-medium text-[#13112B]/70 italic">Unbenannter Boulder</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#E08636] font-medium">Video fehlt</span>
              </div>
            </div>
            <button className="p-2 text-[#13112B]/40 hover:text-[#13112B]">
              <Edit className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Sector Card */}
          <div className="bg-white border border-[#E7F7E9] p-0 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="h-24 bg-gray-200 relative">
              <img src="https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=400&h=200&fit=crop" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-3 left-4 text-white font-heading text-xl">SEKTOR CAVE</div>
            </div>
            <div className="p-3 flex justify-between items-center">
              <span className="text-xs text-[#13112B]/60 font-medium">24 Boulder aktiv</span>
              <button className="text-xs bg-[#F9FAF9] border border-[#E7F7E9] px-2 py-1 rounded-md text-[#13112B]">Details</button>
            </div>
          </div>

          {/* User Card */}
          <div className="bg-white border border-[#E7F7E9] p-3 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#13112B] text-white flex items-center justify-center text-xs font-bold">AL</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[#13112B]">Alex Setter</div>
              <div className="text-xs text-[#13112B]/50">Routenschrauber</div>
            </div>
            <button className="p-2 text-gray-400 hover:text-[#13112B]">
              <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Planning Card */}
          <div className="bg-white border border-l-4 border-l-[#36B531] border-y-[#E7F7E9] border-r-[#E7F7E9] p-3 rounded-r-xl rounded-l-sm shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-[#36B531] font-bold uppercase mb-1">Heute, 14:00</div>
              <div className="font-medium text-sm text-[#13112B]">Schrauben: Sektor B</div>
            </div>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 border border-white"></div>
              <div className="w-6 h-6 rounded-full bg-gray-300 border border-white"></div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: ADMIN & SETTER TOOLS */}
      <div className="space-y-6">
        <h3 className="font-heading text-2xl text-[#13112B] flex items-center gap-2">
          <Wrench className="w-5 h-5" strokeWidth={1.5} /> Admin &amp; Setter Tools
        </h3>

        {/* Batch Upload Row */}
        <div className="bg-white border border-[#E7F7E9] rounded-xl overflow-hidden">
          <div className="bg-[#F9FAF9] px-4 py-2 border-b border-[#E7F7E9] flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-[#13112B]/50">Batch Upload Row</span>
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
          </div>
          <div className="p-3 flex items-center gap-4">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#36B531] focus:ring-[#36B531]" />
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              <input type="text" placeholder="Name..." className="px-2 py-1 text-xs border border-[#E7F7E9] rounded bg-[#F9FAF9]" />
              <div className="px-2 py-1 text-xs border border-[#E7F7E9] rounded bg-[#F9FAF9] text-gray-400">6A</div>
              <div className="px-2 py-1 text-xs border border-[#E7F7E9] rounded bg-[#F9FAF9] text-gray-400">Blau</div>
            </div>
          </div>
        </div>

        {/* Color Management Row */}
        <div className="flex items-center gap-3 p-3 bg-white border border-[#E7F7E9] rounded-xl">
          <div className="w-8 h-8 rounded-full bg-[#D65448] shadow-sm border border-black/5"></div>
          <div className="flex-1">
            <span className="text-sm font-medium">Rot (Hard)</span>
            <span className="text-xs text-gray-400 block">#D65448</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer scale-75">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#36B531]"></div>
          </label>
          <button className="p-2 text-gray-400 hover:text-[#13112B]">
            <Edit2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Sector Management Row */}
        <div className="flex items-center justify-between p-3 bg-white border border-[#E7F7E9] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="cursor-move text-gray-300">
              <GripVertical className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium">Sektor A</span>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-[#F9FAF9] rounded text-[#13112B]">
              <QrCode className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button className="p-2 bg-[#F9FAF9] rounded text-[#13112B]">
              <Edit className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION: STATES & FEEDBACK */}
      <div className="space-y-6">
        <h3 className="font-heading text-2xl text-[#13112B] flex items-center gap-2">
          <Loader className="w-5 h-5" strokeWidth={1.5} /> Zustände &amp; Feedback
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skeleton Loading */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Ladezustand (Skeleton)</label>
            <SkeletonBlock />
          </div>

          {/* Toasts */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Toasts</label>
            <div className="flex flex-col gap-2">
              <ToastSuccess>Gespeichert!</ToastSuccess>
              <ToastError>Upload fehlgeschlagen.</ToastError>
            </div>
          </div>

          {/* Empty State */}
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-[#13112B]/60 uppercase tracking-wide">Leerer Zustand</label>
            <EmptyState actionLabel="Erstellen" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemView;
