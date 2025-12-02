import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Search as SearchIcon } from 'lucide-react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextInput = forwardRef<HTMLInputElement, InputProps>(function TextInput(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full px-4 py-3 bg-white border border-[#E7F7E9] rounded-xl text-sm focus:outline-none focus:border-[#36B531] focus:ring-1 focus:ring-[#36B531] transition-all',
        className
      )}
      {...props}
    />
  );
});

export const DateInput = forwardRef<HTMLInputElement, InputProps>(function DateInput(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="date"
      className={cn(
        'w-full px-4 py-3 bg-white border border-[#E7F7E9] rounded-xl text-sm text-[#13112B] focus:outline-none focus:border-[#36B531] transition-all',
        className
      )}
      {...props}
    />
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-4 py-3 bg-white border border-[#E7F7E9] rounded-xl text-sm focus:outline-none focus:border-[#36B531] focus:ring-1 focus:ring-[#36B531] resize-none transition-all',
        className
      )}
      {...props}
    />
  );
});

export type SearchInputProps = InputProps & {
  containerClassName?: string;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, containerClassName, ...props },
  ref
) {
  return (
    <div className={cn('relative', containerClassName)}>
      <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-[#13112B]/40" strokeWidth={1.5} />
      <input
        ref={ref}
        className={cn(
          'w-full pl-10 pr-4 py-3 bg-[#F9FAF9] border border-[#E7F7E9] rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#36B531] transition-all',
          className
        )}
        {...props}
      />
    </div>
  );
});

export default TextInput;
