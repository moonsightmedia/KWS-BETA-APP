import React from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ToastSuccess({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-[#13112B] text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 text-sm', className)}>
      <Check className="w-4 h-4 text-[#36B531]" strokeWidth={1.5} />
      <span>{children ?? 'Gespeichert!'}</span>
    </div>
  );
}

export function ToastError({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-red-100 text-red-600 px-4 py-3 rounded-lg shadow-sm flex items-center gap-3 text-sm', className)}>
      <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
      <span>{children ?? 'Upload fehlgeschlagen.'}</span>
    </div>
  );
}

export default ToastSuccess;
