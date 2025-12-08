import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TransposeControls } from '../TransposeControls';
import { LineDisplay } from '../common/LineDisplay';
import { groupIntoSections } from '../../utils/songDisplay';
import { useDynamicFontSize } from '../../hooks/useDynamicFontSize';
import { getRandomBackground, preloadBackgrounds } from '../../utils/backgrounds';
import type { ParsedSong, ParsedLine } from '../../types';
import './SandboxView.css';

// Preload backgrounds on component load
preloadBackgrounds().catch(console.warn);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Mobile/tablet detection
function isMobileOrTablet(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/.test(userAgent);
  const isTouchWithSmallScreen = navigator.maxTouchPoints > 0 && window.innerWidth < 1024;
  return isMobileUA || isTouchWithSmallScreen;
}

// Simple debounce hook
function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const debouncedFn = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedFn as T;
}

// Map editor line number to parsed line index
function editorLineToParsedIndex(editorLine: number, parsedSong: ParsedSong | null): number {
  if (!parsedSong) return -1;
  
  // Count metadata lines (title, credits, empty line before content)
  // The first parsed line corresponds to what comes after metadata
  // We need to figure out how many lines the metadata takes
  // For simplicity, assume metadata is: title line, credits line, empty line = 3 lines
  // But this can vary. Let's estimate by looking at song structure.
  
  // The parsed lines start AFTER metadata. So editor line 0 = title,
  // line 1 = credits, line 2 = empty, then parsed lines start.
  // But we don't know exact metadata structure, so we'll use a heuristic:
  // Metadata ends at first empty line, which is typically line 2-3.
  
  // For bidirectional sync, we'll store the line offset dynamically.
  // For now, let's assume metadata takes 2-3 lines.
  // A better approach: count non-empty lines before first empty line.
  
  // Actually, let's just offset by the number of metadata lines.
  // parsedSong doesn't tell us how many raw lines were metadata.
  // We'll need to track this separately. For now, use a heuristic.
  const metadataLines = 3; // title, credits, empty line
  const parsedLineIndex = editorLine - metadataLines;
  
  if (parsedLineIndex < 0) return -1;
  if (parsedLineIndex >= parsedSong.lines.length) return -1;
  
  return parsedLineIndex;
}

// Map parsed line index back to editor line
function parsedIndexToEditorLine(parsedIndex: number): number {
  const metadataLines = 3;
  return parsedIndex + metadataLines;
}

export function SandboxView() {
  // Check mobile first
  const [isMobile] = useState(() => isMobileOrTablet());
  
  // State
  const [rawText, setRawText] = useState('');
  const [parsedSong, setParsedSong] = useState<ParsedSong | null>(null);
  const [displayMode, setDisplayMode] = useState<'lyrics' | 'chords'>('chords');
  const [keyOffset, setKeyOffset] = useState(0);
  const [panelsSwapped, setPanelsSwapped] = useState(false); // false = preview left, editor right (Hebrew default)
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [editorLine, setEditorLine] = useState<number>(0); // Current line in editor for highlighting
  const [editorDirection, setEditorDirectionState] = useState<'rtl' | 'ltr'>('rtl'); // Manual toggle, default RTL
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBackground, setCurrentBackground] = useState(() => getRandomBackground());
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [editorScrollTop, setEditorScrollTop] = useState(0);
  
  // Parse function
  const parseMarkup = useCallback(async (text: string) => {
    if (!text.trim()) {
      setParsedSong(null);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/tools/parse-markup`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to parse: ${response.status}`);
      }
      
      const result = await response.json();
      setParsedSong(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse');
      console.error('Parse error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Debounced parse
  const debouncedParse = useDebouncedCallback(parseMarkup, 500);
  
  // RLM (Right-to-Left Mark) character - forces bidi run boundaries
  const RLM = '\u200F';
  
  // Process text for RTL display by inserting RLM before each word/chord
  // This makes each word a separate bidi run, so they get ordered RTL
  const processTextForRtl = useCallback((text: string): string => {
    // Strip any existing RLM to avoid duplicates
    const stripped = text.replace(/\u200F/g, '');
    // Insert RLM before each chord token (including optional / prefix for bass notes)
    // The /? captures slash so it stays with the chord (e.g., /F# stays together)
    // This forces each word to be a separate bidi run
    return stripped.replace(/(^|[\s\n])(\/?)([A-Za-z\u0590-\u05FF])/gm, `$1${RLM}$2$3`);
  }, []);
  
  // Strip RLM characters for storage/parsing
  const stripRlm = useCallback((text: string): string => {
    return text.replace(/\u200F/g, '');
  }, []);
  
  // Handle copy - strip RLM characters so clipboard gets clean text
  const handleCopy = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (editorDirection === 'rtl') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = start !== end 
        ? textarea.value.substring(start, end)
        : textarea.value; // If nothing selected, copy all
      const cleanText = stripRlm(selectedText);
      e.clipboardData.setData('text/plain', cleanText);
    }
    // In LTR mode, let default copy behavior work
  }, [editorDirection, stripRlm]);
  
  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const newValue = textarea.value;
    const cursorPos = textarea.selectionStart;
    const scrollTop = textarea.scrollTop; // Save scroll position
    
    if (editorDirection === 'rtl') {
      // Strip RLM from the new value to get clean text
      const cleanText = stripRlm(newValue);
      // Process for RTL display
      const processedText = processTextForRtl(cleanText);
      
      // Calculate new cursor position
      // Count how many RLM chars were added before the cursor position
      const cleanBeforeCursor = stripRlm(newValue.substring(0, cursorPos));
      const processedBeforeCursor = processTextForRtl(cleanBeforeCursor);
      const newCursorPos = processedBeforeCursor.length;
      
      setRawText(processedText);
      // Send clean text (without RLM) to parser
      debouncedParse(cleanText);
      
      // Restore cursor position AND scroll position after React re-renders
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.scrollTop = scrollTop; // Restore scroll position
        }
      });
    } else {
      // LTR mode - no processing needed
      setRawText(newValue);
      debouncedParse(newValue);
    }
  };
  
  // Handle paste - immediate parse
  const handlePaste = () => {
    // Small timeout to let the paste complete
    setTimeout(() => {
      if (textareaRef.current) {
        const pastedValue = textareaRef.current.value;
        if (editorDirection === 'rtl') {
          const cleanText = stripRlm(pastedValue);
          const processedText = processTextForRtl(cleanText);
          setRawText(processedText);
          parseMarkup(cleanText);
        } else {
          setRawText(pastedValue);
          parseMarkup(pastedValue);
        }
      }
    }, 10);
  };
  
  // Handle cursor position change in textarea
  const handleTextareaSelect = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const currentEditorLine = textBeforeCursor.split('\n').length - 1;
    
    // Update editor line for highlighting
    setEditorLine(currentEditorLine);
    
    // Update preview highlight if we have parsed content
    if (parsedSong) {
      const parsedIndex = editorLineToParsedIndex(currentEditorLine, parsedSong);
      setHighlightedLine(parsedIndex >= 0 ? parsedIndex : null);
    }
  };
  
  // Handle display mode change - refresh background when switching to lyrics
  const handleDisplayModeChange = (mode: 'lyrics' | 'chords') => {
    setDisplayMode(mode);
    if (mode === 'lyrics') {
      setCurrentBackground(getRandomBackground());
    }
  };
  
  // Handle editor scroll
  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    setEditorScrollTop(e.currentTarget.scrollTop);
  };
  
  // Handle click on preview line
  const handlePreviewLineClick = (parsedIndex: number) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const editorLine = parsedIndexToEditorLine(parsedIndex);
    const lines = textarea.value.split('\n');
    
    // Calculate cursor position for start of that line
    let cursorPos = 0;
    for (let i = 0; i < editorLine && i < lines.length; i++) {
      cursorPos += lines[i].length + 1; // +1 for newline
    }
    
    textarea.focus();
    textarea.setSelectionRange(cursorPos, cursorPos);
    setHighlightedLine(parsedIndex);
  };
  
  // Group lines for display
  const sections = useMemo(() => {
    if (!parsedSong) return [];
    return groupIntoSections(parsedSong.lines, displayMode === 'chords');
  }, [parsedSong, displayMode]);
  
  // Dynamic font sizing
  useDynamicFontSize(previewContainerRef, [sections, displayMode, isExpanded]);
  
  // Mobile blocker
  if (isMobile) {
    return (
      <div className="sandbox-mobile-blocker">
        <div className="blocker-content">
          <span className="blocker-icon">🖥️</span>
          <h2>לא נתמך במכשירים ניידים</h2>
          <p>כלי זה מיועד לשימוש במחשב בלבד</p>
          <p className="blocker-english">This tool is not supported on mobile devices</p>
        </div>
      </div>
    );
  }
  
  const isRtl = parsedSong?.metadata.direction === 'rtl';
  
  // Editor direction is manually controlled via toggle
  const editorIsRtl = editorDirection === 'rtl';
  
  // Handle direction change - process text accordingly
  const setEditorDirection = useCallback((newDirection: 'rtl' | 'ltr') => {
    if (newDirection === 'rtl' && editorDirection === 'ltr') {
      // Switching to RTL - add RLM characters
      const cleanText = stripRlm(rawText);
      const processedText = processTextForRtl(cleanText);
      setRawText(processedText);
    } else if (newDirection === 'ltr' && editorDirection === 'rtl') {
      // Switching to LTR - remove RLM characters
      const cleanText = stripRlm(rawText);
      setRawText(cleanText);
    }
    setEditorDirectionState(newDirection);
  }, [editorDirection, rawText, processTextForRtl, stripRlm]);
  
  // Build flat line list with original indices for highlighting
  const flatLinesWithIndices: { line: ParsedLine; originalIndex: number }[] = [];
  let lineCounter = 0;
  for (const line of parsedSong?.lines || []) {
    if (displayMode === 'lyrics' && (line.type === 'directive' || line.type === 'chords')) {
      lineCounter++;
      continue;
    }
    if (line.type !== 'empty') {
      flatLinesWithIndices.push({ line, originalIndex: lineCounter });
    }
    lineCounter++;
  }
  
  // Preview panel content
  const PreviewPanel = (
    <div className={`sandbox-preview ${isExpanded ? 'expanded' : ''}`}>
      {/* Preview header with metadata */}
      <div className={`preview-header ${isRtl ? 'rtl' : 'ltr'}`}>
        <span className="preview-title">תצוגה מקדימה</span>
        {parsedSong && (
          <div className="preview-metadata">
            <span className="metadata-title">{parsedSong.metadata.title}</span>
            {parsedSong.metadata.artist && (
              <span className="metadata-artist"> - {parsedSong.metadata.artist}</span>
            )}
            {parsedSong.metadata.credits && (
              <span className="metadata-credits"> | {parsedSong.metadata.credits}</span>
            )}
          </div>
        )}
        {isLoading && <span className="loading-indicator">⏳</span>}
      </div>
      
      {/* Preview content */}
      {error ? (
        <div className="preview-error">
          <span>❌ שגיאה: {error}</span>
        </div>
      ) : !parsedSong ? (
        <div className="preview-empty">
          <span>התחל לכתוב כדי לראות תצוגה מקדימה</span>
        </div>
      ) : (
        <div 
          className={`sandbox-preview-container ${isRtl ? 'rtl' : 'ltr'}`}
          style={displayMode === 'lyrics' && currentBackground ? 
            { '--viewer-bg': `url('${currentBackground}')` } as React.CSSProperties : 
            undefined
          }
        >
          {/* Lyrics/chords container */}
          <div 
            ref={previewContainerRef}
            className={`lyrics-container ${displayMode} ${isRtl ? 'rtl' : 'ltr'}`}
          >
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="lyrics-section">
                {section.map((line, lineIndex) => {
                  // Find original index for this line
                  const flatEntry = flatLinesWithIndices.find(f => f.line === line);
                  const originalIndex = flatEntry?.originalIndex ?? -1;
                  const isHighlighted = highlightedLine === originalIndex;

                  return (
                    <LineDisplay
                      key={lineIndex}
                      line={line}
                      showChords={displayMode === 'chords'}
                      lineIndex={originalIndex}
                      keyOffset={keyOffset}
                      onClick={originalIndex >= 0 ? handlePreviewLineClick : undefined}
                      isHighlighted={isHighlighted}
                      highlightClassName="sandbox-highlighted"
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  
  // Editor panel content
  const EditorPanel = (
    <div className={`sandbox-editor ${isExpanded ? 'hidden' : ''}`}>
      <div className={`editor-header ${editorIsRtl ? 'rtl' : 'ltr'}`}>
        <span className="editor-title">עורך</span>
        {parsedSong && (
          <div className="editor-metadata">
            <span className="metadata-title">{parsedSong.metadata.title}</span>
            {parsedSong.metadata.artist && (
              <span className="metadata-artist"> - {parsedSong.metadata.artist}</span>
            )}
          </div>
        )}
      </div>
      <div className="editor-content-wrapper">
        <textarea
          ref={textareaRef}
          value={rawText}
          onChange={handleTextChange}
          onPaste={handlePaste}
          onCopy={handleCopy}
          onSelect={handleTextareaSelect}
          onKeyUp={handleTextareaSelect}
          onClick={handleTextareaSelect}
          onScroll={handleEditorScroll}
          placeholder="הדבק כאן את השיר..."
          className={`sandbox-textarea ${editorIsRtl ? 'rtl' : 'ltr'}`}
          dir={editorDirection}
          spellCheck={false}
        />
        {/* Line highlight overlay - adjusts for scroll position */}
        <div 
          className="editor-line-highlight"
          style={{
            '--highlight-line': editorLine,
            '--scroll-offset': `${editorScrollTop}px`,
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
  
  return (
    <div className="sandbox-view">
      {/* Toolbar */}
      <div className="sandbox-toolbar">
        <div className="toolbar-left">
          <button 
            onClick={() => setPanelsSwapped(!panelsSwapped)}
            className="toolbar-btn swap-btn"
            title="החלף צדדים"
          >
            🔄
          </button>
          
          <div className="mode-toggle">
            <button 
              className={displayMode === 'chords' ? 'active' : ''}
              onClick={() => handleDisplayModeChange('chords')}
            >
              🎸 אקורדים
            </button>
            <button 
              className={displayMode === 'lyrics' ? 'active' : ''}
              onClick={() => handleDisplayModeChange('lyrics')}
            >
              🎤 מילים
            </button>
          </div>
          
          <TransposeControls
            currentOffset={keyOffset}
            adminOffset={0}
            isAdmin={false}
            onOffsetChange={setKeyOffset}
          />
          
          {/* RTL/LTR toggle for editor direction */}
          <div className="direction-toggle">
            <button 
              className={editorDirection === 'rtl' ? 'active' : ''}
              onClick={() => setEditorDirection('rtl')}
              title="עברית (ימין לשמאל)"
            >
              RTL
            </button>
            <button 
              className={editorDirection === 'ltr' ? 'active' : ''}
              onClick={() => setEditorDirection('ltr')}
              title="English (Left to Right)"
            >
              LTR
            </button>
          </div>
        </div>
        
        <div className="toolbar-right">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`toolbar-btn expand-btn ${isExpanded ? 'active' : ''}`}
            title={isExpanded ? 'הצג עורך' : 'הרחב תצוגה מקדימה'}
          >
            {isExpanded ? '⬅️' : '➡️'}
          </button>
        </div>
      </div>
      
      {/* Split pane - default: preview LEFT, editor RIGHT (Hebrew layout) */}
      <div className={`sandbox-split-pane ${isExpanded ? 'expanded' : ''}`}>
        {panelsSwapped ? (
          <>
            {EditorPanel}
            {PreviewPanel}
          </>
        ) : (
          <>
            {PreviewPanel}
            {EditorPanel}
          </>
        )}
      </div>
    </div>
  );
}

