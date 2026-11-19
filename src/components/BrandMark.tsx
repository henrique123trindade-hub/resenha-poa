import React from 'react';

export const BrandWordmark: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  tone?: 'on-dark' | 'on-light';
}> = ({ size = 'md', tone = 'on-dark' }) => {
  const sizeClass =
    size === 'sm'
      ? 'text-xl'
      : size === 'lg'
        ? 'text-3xl sm:text-4xl'
        : 'text-2xl sm:text-[26px]';

  const onDark = tone === 'on-dark';

  return (
    <span
      className={`inline-flex items-center font-display font-extrabold italic uppercase tracking-[-0.02em] leading-none select-none ${sizeClass} ${
        onDark ? 'text-[#F4F4F2]' : 'text-[#080808]'
      }`}
    >
      <span>RESENHA</span>
      <span
        className={`ml-1 px-1.5 py-0.5 not-italic rounded-[2px] leading-none ${
          onDark ? 'bg-[#F4F4F2] text-[#080808]' : 'bg-[#080808] text-[#F4F4F2]'
        }`}
      >
        POA
      </span>
    </span>
  );
};

export const BrushUnderline: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 220 12"
    fill="none"
    aria-hidden="true"
    className={`w-full h-2.5 ${className}`}
    preserveAspectRatio="none"
  >
    <path
      d="M2 8.5C58 3.2 146 2.5 218 6.5"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  </svg>
);

export const PaperTearDivider: React.FC<{
  fill?: string;
  className?: string;
  flip?: boolean;
}> = ({ fill = '#F4F4F2', className = '', flip = false }) => (
  <svg
    viewBox="0 0 1440 28"
    fill="none"
    preserveAspectRatio="none"
    aria-hidden="true"
    className={`w-full h-4 sm:h-6 block ${flip ? 'rotate-180' : ''} ${className}`}
  >
    <path
      d="M0 19L42 13L106 21L168 10L236 18L304 8L378 17L452 11L534 20L612 9L694 18L778 7L854 19L936 12L1016 21L1094 10L1176 17L1254 8L1336 18L1400 12L1440 16V28H0V19Z"
      fill={fill}
    />
  </svg>
);
