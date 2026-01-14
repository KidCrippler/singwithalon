import { FullscreenExitButton } from '../../../common/FullscreenExitButton';

interface SplashScreenProps {
  splashUrl: string | null;
  roomDisplayName: string | null;
  isFullscreen: boolean;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
}

export function SplashScreen({
  splashUrl,
  roomDisplayName,
  isFullscreen,
  onEnterFullscreen,
  onExitFullscreen,
}: SplashScreenProps) {
  return (
    <div className="playing-now-splash">
      {splashUrl ? (
        <img
          src={splashUrl}
          alt={roomDisplayName || 'ממתין לשיר'}
          className="splash-image"
        />
      ) : (
        <div className="splash-fallback">
          <div className="splash-icon">🎤</div>
          <h1>{roomDisplayName || 'שרים ביחד'}</h1>
          <p>ממתין לשיר...</p>
        </div>
      )}

      {/* Fullscreen button */}
      {!isFullscreen && (
        <button
          onClick={onEnterFullscreen}
          className="splash-fullscreen-btn"
          title="מסך מלא"
          aria-label="מסך מלא"
        >
          ⛶
        </button>
      )}

      {/* Exit fullscreen button */}
      {isFullscreen && (
        <FullscreenExitButton onExit={onExitFullscreen} variant="light" />
      )}
    </div>
  );
}
