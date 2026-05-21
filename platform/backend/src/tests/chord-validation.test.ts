/**
 * Unit tests for chord token validation and RTL reversal.
 * Run with: npx tsx src/tests/chord-validation.test.ts
 */

import { isValidChordToken, reverseChordLineForRtl } from '../routes/songs.js';
import { isCue, isChordLine, parseLine } from '../services/songParser.js';
import type { ParsedLine } from '../types/index.js';

interface TestCase {
  input: string;
  expected: boolean;
  description: string;
}

interface ReversalTestCase {
  input: string;
  expected: string;
  description: string;
}

const testCases: TestCase[] = [
  // === Basic Chords ===
  { input: 'C', expected: true, description: 'Simple major chord' },
  { input: 'Am', expected: true, description: 'Minor chord' },
  { input: 'G7', expected: true, description: 'Seventh chord' },
  { input: 'Dm7', expected: true, description: 'Minor seventh chord' },
  { input: 'Cmaj7', expected: true, description: 'Major seventh chord' },
  { input: 'Fmaj7', expected: true, description: 'Major seventh chord (F)' },
  { input: 'Bm7b5', expected: true, description: 'Half-diminished chord' },
  { input: 'Bdim', expected: true, description: 'Diminished chord' },
  { input: 'Caug', expected: true, description: 'Augmented chord' },
  { input: 'Dsus4', expected: true, description: 'Suspended 4th chord' },
  { input: 'Dsus2', expected: true, description: 'Suspended 2nd chord' },
  { input: 'Asus4', expected: true, description: 'A suspended 4th chord' },
  { input: 'B7sus4', expected: true, description: 'B dominant 7 suspended 4th' },
  { input: 'A9sus4', expected: true, description: 'A dominant 9 suspended 4th' },
  { input: 'Cm7sus4', expected: true, description: 'C minor 7 suspended 4th' },
  { input: 'G7sus2', expected: true, description: 'G dominant 7 suspended 2nd' },
  { input: 'Eadd9', expected: true, description: 'Add9 chord' },
  { input: 'Fo7', expected: true, description: 'Diminished 7th (o notation)' },
  { input: 'F°7', expected: true, description: 'Diminished 7th (° notation)' },
  { input: 'B°7', expected: true, description: 'Diminished 7th with ° (standard position)' },
  { input: '°B7', expected: false, description: 'Invalid: ° before note letter is not valid notation' },
  { input: 'C+', expected: true, description: 'Augmented chord (+ notation)' },
  { input: 'G+', expected: true, description: 'Augmented chord G+ (+ notation)' },
  { input: 'D7+', expected: true, description: 'Augmented seventh (D7+)' },
  { input: 'A7+', expected: true, description: 'Augmented seventh (A7+)' },
  { input: 'C9+', expected: true, description: 'Augmented ninth (C9+)' },
  { input: 'F#7+', expected: true, description: 'Sharp augmented seventh (F#7+)' },
  { input: 'Bb9+', expected: true, description: 'Flat augmented ninth (Bb9+)' },
  
  // === Diminished with ordinal indicator (º U+00BA) ===
  { input: 'C#º7', expected: true, description: 'Diminished 7th with ordinal indicator (º)' },
  { input: 'Dº7', expected: true, description: 'Diminished 7th Dº7 with ordinal indicator' },
  { input: 'Gº', expected: true, description: 'Diminished Gº with ordinal indicator' },
  
  // === Accidentals ===
  { input: 'F#', expected: true, description: 'Sharp chord' },
  { input: 'Bb', expected: true, description: 'Flat chord' },
  { input: 'F#m', expected: true, description: 'Sharp minor chord' },
  { input: 'Bbm7', expected: true, description: 'Flat minor seventh' },
  { input: 'C#dim', expected: true, description: 'Sharp diminished' },
  { input: 'Ebmaj7', expected: true, description: 'Flat major seventh' },
  
  // === Slash Chords (with bass note) ===
  { input: 'A/C#', expected: true, description: 'Slash chord with sharp bass' },
  { input: 'G/B', expected: true, description: 'Slash chord' },
  { input: 'Am/G', expected: true, description: 'Minor slash chord' },
  { input: 'D/F#', expected: true, description: 'Slash chord with sharp bass' },
  
  // === Bass-Only Notation ===
  { input: '/F', expected: true, description: 'Bass-only notation' },
  { input: '/Bb', expected: true, description: 'Bass-only flat' },
  { input: '/A', expected: true, description: 'Bass-only simple' },
  { input: '/F#', expected: true, description: 'Bass-only sharp' },
  { input: '/C7', expected: false, description: 'Invalid bass-only (has quality)' },
  { input: '/Fm7', expected: false, description: 'Invalid bass-only (has quality)' },
  { input: '/F#o7', expected: false, description: 'Invalid bass-only (has quality)' },
  
  // === Exclamation Mark (Emphasis) ===
  { input: 'Am!', expected: true, description: 'Chord with emphasis' },
  { input: 'G7!', expected: true, description: 'Seventh chord with emphasis' },
  { input: 'F#m!', expected: true, description: 'Sharp minor with emphasis' },
  
  // === Major Chord Variations ===
  { input: 'CMaj7', expected: true, description: 'Major 7 with capital Maj' },
  { input: 'BbMaj7', expected: true, description: 'Flat major 7 with capital Maj' },
  { input: 'F#Maj9', expected: true, description: 'Sharp major 9 with capital Maj' },
  { input: 'CM7', expected: true, description: 'Major 7 with capital M' },
  { input: 'DM9', expected: true, description: 'Major 9 with capital M' },
  { input: 'EbM7', expected: true, description: 'Flat major 7 with capital M' },
  { input: 'Cmin7', expected: true, description: 'Minor with min suffix' },
  { input: 'DMin7', expected: true, description: 'Minor with capital Min suffix' },
  
  // === Bracketed Chords ===
  { input: '[Em]', expected: true, description: 'Bracketed chord' },
  { input: '[Am7]', expected: true, description: 'Bracketed seventh chord' },
  { input: '[F#m]', expected: true, description: 'Bracketed sharp minor' },
  { input: '[Bb]', expected: true, description: 'Bracketed flat chord' },
  { input: '[E]', expected: true, description: 'Bracketed simple chord' },
  { input: '[BbMaj7]', expected: true, description: 'Bracketed major 7 with capital Maj' },
  { input: '[B7sus4]', expected: true, description: 'Bracketed B7sus4' },
  { input: '[Asus4]', expected: true, description: 'Bracketed Asus4' },
  { input: '[D7+]', expected: true, description: 'Bracketed augmented seventh [D7+]' },
  { input: '[A7+]', expected: true, description: 'Bracketed augmented seventh [A7+]' },
  
  // === Bracketed Bass-Only Notation ===
  { input: '[/A]', expected: true, description: 'Bracketed bass-only' },
  { input: '[/F#]', expected: true, description: 'Bracketed bass-only sharp' },
  { input: '[/Bb]', expected: true, description: 'Bracketed bass-only flat' },
  { input: '[/E]', expected: true, description: 'Bracketed bass-only simple' },
  
  // === Empty Brackets (placeholder/rest) ===
  { input: '[]', expected: true, description: 'Empty brackets as rest/placeholder' },
  
  // === Special Markers ===
  { input: '--->', expected: true, description: 'Right arrow (3 hyphens)' },
  { input: '-->', expected: true, description: 'Right arrow (2 hyphens)' },
  { input: '<---', expected: true, description: 'Left arrow (3 hyphens)' },
  { input: '<--', expected: true, description: 'Left arrow (2 hyphens)' },
  { input: '-', expected: true, description: 'Single hyphen separator' },
  { input: 'x', expected: true, description: 'Repeat marker' },
  { input: '2', expected: true, description: 'Repeat count' },
  { input: '3', expected: true, description: 'Repeat count' },
  { input: '4', expected: true, description: 'Repeat count' },
  { input: 'x2', expected: true, description: 'Repeat marker with count (x2)' },
  { input: 'x3', expected: true, description: 'Repeat marker with count (x3)' },
  { input: 'x4', expected: true, description: 'Repeat marker with count (x4)' },
  { input: 'X2', expected: true, description: 'Repeat marker with count (uppercase X2)' },
  { input: 'X10', expected: true, description: 'Repeat marker with multi-digit count (X10)' },
  
  // === Parenthesized (partial tokens) ===
  { input: '(Cm', expected: true, description: 'Opening paren chord' },
  { input: 'Bb)', expected: true, description: 'Closing paren chord' },
  { input: '(Em)', expected: true, description: 'Fully parenthesized chord' },
  
  // === Inline Directives (allowed in chord lines) ===
  { input: '{אקפלה}', expected: true, description: 'Hebrew inline directive' },
  { input: '{Intro}', expected: true, description: 'English inline directive' },
  { input: '{Brass Solo}', expected: true, description: 'Multi-word inline directive' },
  { input: '{Guitar}', expected: true, description: 'Instrument directive' },
  { input: '{}', expected: false, description: 'Empty braces (not valid)' },
  
  // === Invalid Tokens ===
  { input: 'Hello', expected: false, description: 'Regular word' },
  { input: 'X', expected: false, description: 'Invalid note (X)' },
  { input: 'H', expected: false, description: 'Invalid note (H)' },
  { input: 'Cm7b5#9', expected: false, description: 'Complex extension (may fail)' },
  { input: '', expected: false, description: 'Empty string' },
  { input: 'שלום', expected: false, description: 'Hebrew word' },
];

// === RTL Chord Line Reversal Tests ===
const reversalTestCases: ReversalTestCase[] = [
  // Simple chord lines
  {
    input: '   C  G Am  D  Em    Em',
    expected: 'Em    Em  D  Am G  C   ',
    description: 'Simple chord line without brackets',
  },
  // Parenthesized progression
  {
    input: '(Cm   Ab   Eb   Bb) x 2',
    expected: '2 x (Bb   Eb   Ab   Cm)',
    description: 'Parenthesized chord progression with repeat',
  },
  // Mixed brackets
  {
    input: '(Dm   Am   [E]   Am) x 3',
    expected: '3 x (Am   [E]   Am   Dm)',
    description: 'Mixed parentheses and square brackets',
  },
  // Square brackets only
  {
    input: '[Am]   G   F   [E]',
    expected: '[E]   F   G   [Am]',
    description: 'Square bracketed chords',
  },
  // No brackets
  {
    input: 'Em    B         C',
    expected: 'C         B    Em',
    description: 'Simple line preserving spacing',
  },
  // Single chord in parens
  {
    input: '(Em)',
    expected: '(Em)',
    description: 'Single fully parenthesized chord',
  },
  // Multiple chords in brackets
  {
    input: 'F    [/E]   Am  [Am] ',
    expected: ' [Am]  Am   [/E]    F',
    description: 'Multiple bracketed chords',
  },
  // Base inside brackets
  {
    input: '/E  /E  /A  [/A]',
    expected: '[/A]  /A  /E  /E',
    description: 'Base inside brackets',
  },
  // Arrow continuation markers - should flip direction in RTL
  {
    input: 'Am --->  G',
    expected: 'G  <--- Am',
    description: 'Right arrow flips to left arrow',
  },
  {
    input: '--->  Am   Dm   G    C',
    expected: 'C    G   Dm   Am  <---',
    description: 'Right arrow at start flips to left at end',
  },
  {
    input: 'Am -->  G',
    expected: 'G  <-- Am',
    description: 'Short right arrow flips to left arrow',
  },
  {
    input: 'Am <---  G',
    expected: 'G  ---> Am',
    description: 'Left arrow flips to right arrow',
  },
  {
    input: 'Am <--  G',
    expected: 'G  --> Am',
    description: 'Short left arrow flips to right arrow',
  },
  {
    input: '                      Am  --->',
    expected: '<---  Am                      ',
    description: 'Arrow at end with leading spaces',
  },
  // Inline directives - content is reversed like everything else (for bidi-override display)
  {
    input: 'Am       {אקפלה}',
    expected: '{הלפקא}       Am',
    description: 'Chord with Hebrew directive - content reversed for LTR display',
  },
  {
    input: '       Am       {אקפלה}',
    expected: '{הלפקא}       Am       ',
    description: 'Chord with Hebrew directive and leading spaces',
  },
  {
    input: 'G   {Intro}   Am',
    expected: 'Am   {Intro}   G',
    description: 'English directive between chords - content preserved',
  },
];

// === isCue test cases ===
interface CueTestCase {
  input: string;
  expected: boolean;
  description: string;
}

const cueTestCases: CueTestCase[] = [
  // True cues — section labels in square brackets
  { input: '[פזמון]', expected: true, description: 'Hebrew section label' },
  { input: '[בית]', expected: true, description: 'Hebrew verse label' },
  { input: '[Chorus]', expected: false, description: 'English label starting with C — looks like chord root' },
  { input: '[Bridge]', expected: false, description: 'English label starting with B — looks like chord root' },
  { input: '[intro]', expected: true, description: 'Lowercase label not starting with A-G' },

  // Regression: multi-token chord lines must NOT be treated as cues
  { input: '[]          [E]', expected: false, description: 'Regression: multi-token line with [] and [E]' },
  { input: '[Am]   [G]', expected: false, description: 'Two bracketed chords' },
  { input: '[]', expected: false, description: 'Empty brackets — rest marker, not a cue' },

  // Single bracketed chords are not cues
  { input: '[Am]', expected: false, description: 'Bracketed chord starts with A' },
  { input: '[E]', expected: false, description: 'Bracketed chord starts with E' },
  { input: '[/A]', expected: false, description: 'Bracketed bass-only starts with /' },

  // Not bracket-wrapped at all
  { input: 'פזמון', expected: false, description: 'Label without brackets' },
  { input: '{פזמון}', expected: false, description: 'Curly-brace directive, not a cue' },
];

// === isChordLine test cases ===
interface ChordLineTestCase {
  input: string;
  expected: boolean;
  description: string;
}

const chordLineTestCases: ChordLineTestCase[] = [
  // Should be chord lines
  { input: 'Am G F E', expected: true, description: 'Simple chord sequence' },
  { input: '[]          [E]', expected: true, description: 'Regression: empty bracket placeholder + bracketed chord' },
  { input: '[Am]   G   F   [E]', expected: true, description: 'Mix of bracketed and plain chords' },
  { input: '[] [] []', expected: true, description: 'All empty bracket placeholders' },
  { input: 'Am ---> G', expected: true, description: 'Chord line with arrow' },
  { input: '(Cm   Ab   Eb   Bb) x 2', expected: true, description: 'Progression with parens and repeat' },
  { input: 'Am {אקפלה} G', expected: true, description: 'Chord line with inline directive' },

  // Should NOT be chord lines
  { input: 'הורה האחזות', expected: false, description: 'Hebrew lyric line' },
  { input: 'Hello world', expected: false, description: 'English lyric line' },
  { input: 'Am G ??? E', expected: false, description: 'Contains invalid token' },
  { input: '', expected: false, description: 'Empty string' },
  { input: '[פזמון]', expected: false, description: 'Cue label is not a chord line' },
];

// === parseLine round-trip test cases ===
interface ParseLineTestCase {
  input: string;
  isRtl: boolean;
  expected: Omit<ParsedLine, 'raw'>;
  description: string;
}

const parseLineTestCases: ParseLineTestCase[] = [
  { input: '', isRtl: false, expected: { type: 'empty', text: '' }, description: 'Empty line' },
  { input: '   ', isRtl: false, expected: { type: 'empty', text: '' }, description: 'Whitespace-only line' },
  { input: '{Intro}', isRtl: false, expected: { type: 'directive', text: 'Intro' }, description: 'Curly-brace directive' },
  { input: '[פזמון]', isRtl: false, expected: { type: 'cue', text: 'פזמון' }, description: 'Hebrew cue label' },
  { input: 'Am G F E', isRtl: false, expected: { type: 'chords', text: 'Am G F E' }, description: 'LTR chord line' },
  { input: '[]          [E]', isRtl: false, expected: { type: 'chords', text: '[]          [E]' }, description: 'Regression: [] + [E] is a chord line, not a cue' },
  { input: 'הורה האחזות', isRtl: false, expected: { type: 'lyric', text: 'הורה האחזות' }, description: 'Hebrew lyric' },
  { input: 'Hello world', isRtl: false, expected: { type: 'lyric', text: 'Hello world' }, description: 'English lyric' },
  // RTL chord line gets reversed
  { input: 'Am G', isRtl: true, expected: { type: 'chords', text: 'G Am' }, description: 'RTL chord line is reversed' },
  // Trailing whitespace stripped from lyrics and chords
  { input: 'Am G   ', isRtl: false, expected: { type: 'chords', text: 'Am G' }, description: 'Trailing whitespace stripped from chord line' },
  { input: 'Hello   ', isRtl: false, expected: { type: 'lyric', text: 'Hello' }, description: 'Trailing whitespace stripped from lyric' },
];

function runTests(): void {
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Run chord validation tests
  console.log('=== Chord Token Validation Tests ===\n');
  
  let passed = 0;
  let failed = 0;
  const failures: { testCase: TestCase; actual: boolean }[] = [];
  
  for (const testCase of testCases) {
    const actual = isValidChordToken(testCase.input);
    if (actual === testCase.expected) {
      passed++;
      console.log(`✅ PASS: "${testCase.input}" - ${testCase.description}`);
    } else {
      failed++;
      failures.push({ testCase, actual });
      console.log(`❌ FAIL: "${testCase.input}" - ${testCase.description}`);
      console.log(`   Expected: ${testCase.expected}, Got: ${actual}`);
    }
  }
  
  totalPassed += passed;
  totalFailed += failed;
  
  console.log(`\nChord validation: ${passed} passed, ${failed} failed`);
  
  // Run RTL reversal tests
  console.log('\n=== RTL Chord Line Reversal Tests ===\n');
  
  passed = 0;
  failed = 0;
  const reversalFailures: { testCase: ReversalTestCase; actual: string }[] = [];
  
  for (const testCase of reversalTestCases) {
    const actual = reverseChordLineForRtl(testCase.input);
    if (actual === testCase.expected) {
      passed++;
      console.log(`✅ PASS: "${testCase.input}" → "${actual}"`);
    } else {
      failed++;
      reversalFailures.push({ testCase, actual });
      console.log(`❌ FAIL: ${testCase.description}`);
      console.log(`   Input:    "${testCase.input}"`);
      console.log(`   Expected: "${testCase.expected}"`);
      console.log(`   Got:      "${actual}"`);
    }
  }
  
  totalPassed += passed;
  totalFailed += failed;
  
  console.log(`\nRTL reversal: ${passed} passed, ${failed} failed`);

  // Run isCue tests
  console.log('\n=== isCue Tests ===\n');

  passed = 0;
  failed = 0;

  for (const testCase of cueTestCases) {
    const actual = isCue(testCase.input);
    if (actual === testCase.expected) {
      passed++;
      console.log(`✅ PASS: "${testCase.input}" - ${testCase.description}`);
    } else {
      failed++;
      console.log(`❌ FAIL: "${testCase.input}" - ${testCase.description}`);
      console.log(`   Expected: ${testCase.expected}, Got: ${actual}`);
    }
  }

  totalPassed += passed;
  totalFailed += failed;
  console.log(`\nisCue: ${passed} passed, ${failed} failed`);

  // Run isChordLine tests
  console.log('\n=== isChordLine Tests ===\n');

  passed = 0;
  failed = 0;

  for (const testCase of chordLineTestCases) {
    const actual = isChordLine(testCase.input);
    if (actual === testCase.expected) {
      passed++;
      console.log(`✅ PASS: "${testCase.input}" - ${testCase.description}`);
    } else {
      failed++;
      console.log(`❌ FAIL: "${testCase.input}" - ${testCase.description}`);
      console.log(`   Expected: ${testCase.expected}, Got: ${actual}`);
    }
  }

  totalPassed += passed;
  totalFailed += failed;
  console.log(`\nisChordLine: ${passed} passed, ${failed} failed`);

  // Run parseLine tests
  console.log('\n=== parseLine Tests ===\n');

  passed = 0;
  failed = 0;

  for (const testCase of parseLineTestCases) {
    const actual = parseLine(testCase.input, testCase.isRtl);
    const typeMatch = actual.type === testCase.expected.type;
    const textMatch = actual.text === testCase.expected.text;
    if (typeMatch && textMatch) {
      passed++;
      console.log(`✅ PASS: ${testCase.description}`);
    } else {
      failed++;
      console.log(`❌ FAIL: ${testCase.description}`);
      if (!typeMatch) console.log(`   type:  expected "${testCase.expected.type}", got "${actual.type}"`);
      if (!textMatch) console.log(`   text:  expected "${testCase.expected.text}", got "${actual.text}"`);
    }
  }

  totalPassed += passed;
  totalFailed += failed;
  console.log(`\nparseLine: ${passed} passed, ${failed} failed`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);
  
  if (totalFailed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

runTests();

