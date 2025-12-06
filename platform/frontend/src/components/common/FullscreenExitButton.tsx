import './FullscreenExitButton.css';

interface FullscreenExitButtonProps {
  onExit: () => void;
  variant?: 'light' | 'dark'; // light = for dark backgrounds, dark = for light backgrounds
}

// Inline styles to guarantee positioning regardless of RTL or parent transforms
const buttonStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '16px',
  left: '16px',
  right: 'auto',
  top: 'auto',
  // These ensure physical positioning isn't affected by RTL
  insetInlineStart: 'unset',
  insetInlineEnd: 'unset',
};

export function FullscreenExitButton({ onExit, variant = 'light' }: FullscreenExitButtonProps) {
  return (
    <button
      className={`fullscreen-exit-btn ${variant}`}
      style={buttonStyle}
      onClick={onExit}
      title="יציאה ממסך מלא"
      aria-label="יציאה ממסך מלא"
    >
      ✕
    </button>
  );
}

