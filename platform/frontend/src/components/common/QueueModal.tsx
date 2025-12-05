import { useState, useEffect, useRef } from 'react';

// localStorage key for remembering viewer's name
const VIEWER_NAME_KEY = 'singwithalon_viewer_name';

interface QueueModalProps {
  isOpen: boolean;
  songName: string;
  songArtist: string;
  onSubmit: (requesterName: string, notes: string) => Promise<void>;
  onCancel: () => void;
}

export function QueueModal({ isOpen, songName, songArtist, onSubmit, onCancel }: QueueModalProps) {
  // Initialize from localStorage if available
  const [requesterName, setRequesterName] = useState(() => {
    return localStorage.getItem(VIEWER_NAME_KEY) || '';
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus on appropriate field when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset state
      setNotes('');
      setError(null);
      setIsSubmitting(false);
      
      // Focus name input if empty, otherwise it's pre-filled from localStorage
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = requesterName.trim();
    if (!trimmedName) {
      setError('יש להזין שם');
      nameInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Save name to localStorage for future requests
      localStorage.setItem(VIEWER_NAME_KEY, trimmedName);
      
      await onSubmit(trimmedName, notes.trim());
    } catch (err) {
      // Error will be shown via toast by parent, but we still need to handle state
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'משהו השתבש, נסה שוב');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="queue-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>להוסיף לתור?</h2>
          <button 
            className="modal-close-btn" 
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        <div className="modal-song-info">
          <span className="modal-song-name">{songName}</span>
          <span className="modal-song-artist">{songArtist}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="requester-name">השם שלך</label>
            <input
              ref={nameInputRef}
              id="requester-name"
              type="text"
              value={requesterName}
              onChange={e => setRequesterName(e.target.value)}
              placeholder="הזן את שמך..."
              disabled={isSubmitting}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">
              הערות <span className="optional">(אופציונלי)</span>
            </label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 50))}
              placeholder="הערה קצרה..."
              disabled={isSubmitting}
              maxLength={50}
            />
            <span className="char-count">{notes.length}/50</span>
          </div>

          {error && (
            <div className="modal-error">{error}</div>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              className="modal-cancel-btn"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              ביטול
            </button>
            <button 
              type="submit" 
              className="modal-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'שולח...' : 'הוסף לתור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

