import React from 'react';

export const BrandWordmark: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  tone?: 'on-dark' | 'on-light';
}> = ({ size = 'md', tone = 'on-dark' }) => {
  const heightClass =
    size === 'sm'
      ? 'h-7 sm:h-8'
      : size === 'lg'
        ? 'h-11 sm:h-12'
        : 'h-9 sm:h-10';

  return (
    <span className="inline-flex items-center select-none shrink-0">
      <picture className="inline-flex items-center">
        <source srcSet="/assets/brand/resenhapoa-logo.webp" type="image/webp" />
        <img
          src="/assets/brand/resenhapoa-logo.png"
          alt="ResenhaPOA"
          width={916}
          height={300}
          loading="eager"
          decoding="sync"
          draggable={false}
          className={`${heightClass} w-auto object-contain block ${
            tone === 'on-light' ? 'invert' : ''
          }`}
        />
      </picture>
    </span>
  );
};

export const BrushUnderline: React.FC<{ className?: string }> = ({
  className = 'text-[#FF5A36]',
}) => (
  <svg
    viewBox="0 0 240 14"
    fill="none"
    aria-hidden="true"
    className={`w-full h-3 ${className}`}
    preserveAspectRatio="none"
  >
    <path
      d="M3 10.5C64 3.8 156 2.2 237 6.8"
      stroke="currentColor"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
  </svg>
);

const ACCENT_HEX_TO_CLASS: Record<string, string> = {
  '#FF5A36': 'bg-[#FF5A36]',
  '#5265FF': 'bg-[#5265FF]',
  '#D5FF52': 'bg-[#D5FF52]',
  '#F05AA6': 'bg-[#F05AA6]',
  '#F7F7F5': 'bg-[#F7F7F5]',
};

export const SectionKicker: React.FC<{
  label: string;
  tone?: 'on-dark' | 'on-light';
  accentClass?: string;
  accentColor?: string;
  className?: string;
}> = ({ label, tone = 'on-dark', accentClass, accentColor, className = 'mb-2' }) => {
  const barClass =
    accentClass ||
    (accentColor ? ACCENT_HEX_TO_CLASS[accentColor.toUpperCase()] : undefined) ||
    'bg-[#FF5A36]';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span aria-hidden="true" className={`w-5 h-[2.5px] rounded-full ${barClass}`} />
      <span
        className={`font-label text-[11px] font-bold uppercase tracking-[0.16em] ${
          tone === 'on-light' ? 'text-[#52525B]' : 'text-[#98989F]'
        }`}
      >
        {label}
      </span>
    </div>
  );
};

export const PoaCrownMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none select-none flex flex-col items-center ${className}`}
  >
    <svg viewBox="0 0 84 42" fill="none" className="w-16 h-8 text-[#F7F7F5]/80">
      <path
        d="M10 35L6 10L26 24L42 6L58 24L78 10L74 35H10Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 39H72" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
    <span className="font-display italic font-extrabold uppercase tracking-[0.06em] text-lg leading-[0.92] text-[#F7F7F5]/85 text-center -rotate-6 mt-1">
      PORTO
      <br />
      ALEGRE
    </span>
  </div>
);

export const ScribbleAccent: React.FC<{ className?: string }> = ({
  className = 'text-[#FF5A36]',
}) => (
  <svg
    viewBox="0 0 46 36"
    fill="none"
    aria-hidden="true"
    className={`w-9 h-7 ${className}`}
  >
    <path
      d="M5 27L22 7L16 25L36 6L27 29L42 18"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PaperTearDivider: React.FC<{
  fill?: string;
  className?: string;
  flip?: boolean;
}> = ({ fill = '#F7F7F5', className = '', flip = false }) => (
  <svg
    viewBox="0 0 1440 28"
    fill="none"
    preserveAspectRatio="none"
    aria-hidden="true"
    className={`w-full h-4 sm:h-5 block ${flip ? 'rotate-180' : ''} ${className}`}
  >
    <path
      d="M0 19L42 13L106 21L168 10L236 18L304 8L378 17L452 11L534 20L612 9L694 18L778 7L854 19L936 12L1016 21L1094 10L1176 17L1254 8L1336 18L1400 12L1440 16V28H0V19Z"
      fill={fill}
    />
  </svg>
);
