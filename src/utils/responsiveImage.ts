/**
 * Returns responsive WebP srcSet for local nightlife assets generated at 640w and 1280w.
 * External organizer posters return undefined so official event photos render untouched.
 */
export function getNightlifeSrcSet(src?: string): string | undefined {
  if (!src) return undefined;
  if (src.startsWith('/assets/nightlife/') && src.endsWith('-1280.webp')) {
    const src640 = src.replace('-1280.webp', '-640.webp');
    return `${src640} 640w, ${src} 1280w`;
  }
  return undefined;
}

export function isCampaignNightlifePhoto(src?: string): boolean {
  if (!src) return true;
  return src.startsWith('/assets/nightlife/') || src.startsWith('/assets/aistudio/');
}
