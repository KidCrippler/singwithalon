/**
 * Background image management for the sing-along viewer
 * - Dynamically discovers all .png and .jpg files in /public/backgrounds/
 * - Preloads all backgrounds to browser cache on app startup
 * - Provides random selection for each new song
 */

// Dynamically import all background images using Vite's glob import
// This scans at build time, so new images are picked up on rebuild
const backgroundModules = import.meta.glob<{ default: string }>(
  '/public/backgrounds/*.{png,jpg,jpeg}',
  { eager: true, query: '?url', import: 'default' }
);

// Extract the public URLs from the glob result
// Vite returns paths like "/public/backgrounds/bg1.png" -> we need "/backgrounds/bg1.png"
export const BACKGROUNDS: string[] = Object.keys(backgroundModules).map(
  path => path.replace('/public', '')
);

/**
 * Preload all background images into browser cache.
 * Call this once on app startup to ensure backgrounds are cached
 * before they're needed.
 */
export function preloadBackgrounds(): Promise<void[]> {
  return Promise.all(
    BACKGROUNDS.map(src => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to preload: ${src}`));
        img.src = src;
      });
    })
  );
}

/**
 * Get a random background URL.
 * Optionally exclude a specific background to avoid repeats.
 */
export function getRandomBackground(exclude?: string): string {
  const available = exclude 
    ? BACKGROUNDS.filter(bg => bg !== exclude)
    : BACKGROUNDS;
  
  if (available.length === 0) {
    // Fallback if no backgrounds found or all excluded
    return '/backgrounds/bg1.png';
  }
  
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

