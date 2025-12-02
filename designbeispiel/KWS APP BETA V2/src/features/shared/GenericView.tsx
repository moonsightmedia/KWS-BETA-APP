import { useLocation } from 'react-router-dom';
import { getRouteMeta } from '../../lib/routes';

export function GenericView() {
  const { pathname } = useLocation();
  const meta = getRouteMeta(pathname);
  const Icon = meta?.icon;

  return (
    <div className="view-section fade-in h-full flex flex-col relative">
      {/* Top border and title */}
      <div className="border-b border-[#E7F7E9] pb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-3xl font-semibold tracking-wide text-[#13112B]">
            {meta?.title ?? 'DASHBOARD'}
          </h2>
        </div>
      </div>

      {/* Empty State hero */}
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-6">
        <div className="w-24 h-24 bg-[#F9FAF9] rounded-3xl flex items-center justify-center border border-[#E7F7E9] shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          {Icon ? <Icon className="w-10 h-10 text-[#36B531] relative z-10" strokeWidth={1.5} /> : null}
        </div>
        <div className="max-w-xs mx-auto px-4">
          <h3 className="text-xl font-medium text-[#13112B]">Übersicht</h3>
          <p className="text-sm text-[#13112B]/50 mt-2">
            Du befindest dich im Bereich: <br />
            <span className="font-semibold text-[#36B531]">{meta?.title ?? 'Dashboard'}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default GenericView;
