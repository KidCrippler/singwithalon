/**
 * TransposeControls component
 * 
 * Displays transpose controls: [ ⬇ ] N [ ⬆ ]
 * - Admin version includes sync button (📡) - sends one-time sync event to all viewers
 * - Shows out-of-sync indicator (●) when viewer differs from admin
 */

import { formatOffset } from '../services/transpose';

interface TransposeControlsProps {
  // Current effective offset (what's being displayed)
  currentOffset: number;
  // Admin's key offset (for out-of-sync detection)
  adminOffset: number;
  // Is this the admin view?
  isAdmin: boolean;
  // Is viewer out of sync with admin?
  isOutOfSync?: boolean;
  // Callbacks
  onOffsetChange: (newOffset: number) => void;
  onSync?: () => void;
}

// Offset range: -6 to +6
const MIN_OFFSET = -6;
const MAX_OFFSET = 6;

export function TransposeControls({
  currentOffset,
  adminOffset: _adminOffset,
  isAdmin,
  isOutOfSync = false,
  onOffsetChange,
  onSync,
}: TransposeControlsProps) {
  const handleDecrease = () => {
    if (currentOffset > MIN_OFFSET) {
      onOffsetChange(currentOffset - 1);
    }
  };

  const handleIncrease = () => {
    if (currentOffset < MAX_OFFSET) {
      onOffsetChange(currentOffset + 1);
    }
  };

  const canDecrease = currentOffset > MIN_OFFSET;
  const canIncrease = currentOffset < MAX_OFFSET;

  return (
    <div className="transpose-controls">
      <button
        onClick={handleDecrease}
        disabled={!canDecrease}
        className={`transpose-btn ${!canDecrease ? 'disabled' : ''}`}
        title="טון למטה"
        aria-label="טון למטה"
      >
        <span className="arrow-down">▼</span>
      </button>
      
      <span className="transpose-value">
        {formatOffset(currentOffset)}
        {/* Out-of-sync indicator for viewers */}
        {!isAdmin && isOutOfSync && (
          <span className="out-of-sync-indicator" title="לא מסונכרן עם האדמין">●</span>
        )}
      </span>
      
      <button
        onClick={handleIncrease}
        disabled={!canIncrease}
        className={`transpose-btn ${!canIncrease ? 'disabled' : ''}`}
        title="טון למעלה"
        aria-label="טון למעלה"
      >
        <span className="arrow-up">▲</span>
      </button>
      
      {/* Admin-only sync button - sends one-time sync event */}
      {isAdmin && onSync && (
        <button
          onClick={onSync}
          className="sync-button"
          title="סנכרן את כל הצופים לטון הזה"
        >
          📡
        </button>
      )}
    </div>
  );
}

