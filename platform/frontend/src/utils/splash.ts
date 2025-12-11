/**
 * Splash screen image management for the sing-along viewer
 * - Each room can have a custom splash image stored at /splash/{adminId}.{ext}
 * - Falls back to default splash or null if no splash image exists
 * - Supports multiple image formats: webp, jpg, jpeg, png
 */

// Supported image extensions in order of preference
const SPLASH_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png'];

/**
 * Check if a URL points to an actual image file.
 * Uses HEAD request and verifies content-type is an image.
 * This prevents false positives from SPA fallbacks returning HTML.
 */
async function isImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return false;
    
    const contentType = response.headers.get('content-type');
    return contentType !== null && contentType.startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Get splash screen URL for a specific room.
 * Tries multiple extensions and returns the first that exists.
 * Returns null if no room-specific splash is found (show text fallback).
 * 
 * @param adminId - The room's admin ID
 * @returns Promise resolving to the splash URL or null
 */
export async function getRoomSplash(adminId: number): Promise<string | null> {
  // Try room-specific splash with each extension
  for (const ext of SPLASH_EXTENSIONS) {
    const url = `/splash/${adminId}.${ext}`;
    if (await isImageUrl(url)) {
      return url;
    }
  }

  // No splash found - will show text fallback
  return null;
}

/**
 * Preload a splash image into browser cache.
 * Call this when room is loaded to ensure splash is cached.
 * 
 * @param url - The splash image URL to preload
 */
export function preloadSplash(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload splash: ${url}`));
    img.src = url;
  });
}

