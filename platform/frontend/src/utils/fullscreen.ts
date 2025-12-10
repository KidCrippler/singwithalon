/**
 * Cross-browser fullscreen utilities
 * Handles webkit/moz vendor prefixes for older browsers (Safari, iOS, older Android)
 */

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitFullscreenEnabled?: boolean;
  mozFullScreenEnabled?: boolean;
  msFullscreenEnabled?: boolean;
}

/**
 * Check if fullscreen is supported by the browser
 */
export function isFullscreenSupported(): boolean {
  const doc = document as FullscreenDocument;
  return !!(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled
  );
}

/**
 * Get the current fullscreen element (cross-browser)
 */
export function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return (
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    null
  );
}

/**
 * Check if currently in fullscreen mode
 */
export function isInFullscreen(): boolean {
  return !!getFullscreenElement();
}

/**
 * Request fullscreen for an element (cross-browser)
 * @param element The element to make fullscreen
 * @returns Promise that resolves when fullscreen is entered, or rejects on failure
 */
export async function requestFullscreen(element: HTMLElement | null): Promise<void> {
  if (!element) {
    console.warn('requestFullscreen: No element provided');
    return;
  }

  const el = element as FullscreenElement;
  
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      // Safari/iOS - note: older versions may not return a Promise
      await el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      await el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
    } else {
      console.warn('Fullscreen API not supported on this browser');
    }
  } catch (error) {
    console.error('Error entering fullscreen:', error);
  }
}

/**
 * Exit fullscreen mode (cross-browser)
 * @returns Promise that resolves when fullscreen is exited
 */
export async function exitFullscreen(): Promise<void> {
  const doc = document as FullscreenDocument;
  
  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    }
  } catch (error) {
    console.error('Error exiting fullscreen:', error);
  }
}

/**
 * Add fullscreen change event listener (cross-browser)
 * @param callback Function to call when fullscreen state changes
 * @returns Cleanup function to remove the listener
 */
export function addFullscreenChangeListener(callback: () => void): () => void {
  // Standard
  document.addEventListener('fullscreenchange', callback);
  // Webkit (Safari, older Chrome)
  document.addEventListener('webkitfullscreenchange', callback);
  // Firefox
  document.addEventListener('mozfullscreenchange', callback);
  // IE/Edge
  document.addEventListener('MSFullscreenChange', callback);
  
  return () => {
    document.removeEventListener('fullscreenchange', callback);
    document.removeEventListener('webkitfullscreenchange', callback);
    document.removeEventListener('mozfullscreenchange', callback);
    document.removeEventListener('MSFullscreenChange', callback);
  };
}

