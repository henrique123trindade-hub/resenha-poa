import React, { forwardRef } from 'react';

export interface ResenhaInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  id: string;
  label: string;
  helperText?: string;
  error?: string | null;
  sizeVariant?: 'comfortable' | 'default';
  showCount?: boolean;
  optionalTag?: string;
}

/**
 * Reusable mobile-safe ResenhaPOA text input.
 * Always keeps computed font-size >= 16px on mobile to prevent iOS Safari auto-zoom,
 * enforces comfortable touch heights (54px in 'comfortable' variant), and maintains
 * full-width layout stability without overflow.
 */
export const ResenhaInput = forwardRef<HTMLInputElement, ResenhaInputProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      sizeVariant = 'comfortable',
      showCount = false,
      optionalTag,
      maxLength,
      value,
      className = '',
      ...rest
    },
    ref,
  ) => {
    const helperId = helperText ? `${id}-helper` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
    const currentLen = typeof value === 'string' ? value.length : 0;

    const heightClass =
      sizeVariant === 'comfortable' ? 'min-h-[54px] h-[54px]' : 'min-h-[48px] h-12';

    return (
      <div className="w-full min-w-0 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={id}
            className="block text-sm sm:text-[15px] font-semibold tracking-tight text-[#F7F7F5]"
          >
            {label}
            {optionalTag && (
              <span className="ml-1.5 text-xs font-normal text-[#98989F]">{optionalTag}</span>
            )}
          </label>
          {showCount && typeof maxLength === 'number' && (
            <span
              aria-hidden="true"
              className={`text-[11px] tabular-nums shrink-0 ${
                currentLen >= maxLength ? 'text-[#FF5A36] font-semibold' : 'text-[#98989F]'
              }`}
            >
              {currentLen}/{maxLength}
            </span>
          )}
        </div>

        <input
          ref={ref}
          id={id}
          value={value}
          maxLength={maxLength}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={`w-full min-w-0 ${heightClass} px-4 bg-[#101012] border rounded-xl text-base leading-normal text-[#F7F7F5] placeholder:text-[#98989F]/85 transition-colors focus:outline-none focus-visible:outline-none ${
            error
              ? 'border-[#FF5A36] ring-2 ring-[#FF5A36]/25'
              : 'border-[#28282E] hover:border-[#3A3A44] focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20'
          } ${className}`}
          {...rest}
        />

        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-[#FF6F4F] leading-snug">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-[#98989F] leading-relaxed">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

ResenhaInput.displayName = 'ResenhaInput';
