/**
 * Unit tests for chord token validation and RTL reversal.
 * Run with: npx tsx src/tests/chord-validation.test.ts
 */
import { isValidChordToken, reverseChordLineForRtl } from '../routes/songs.js';
const testCases = [
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
    { input: 'Eadd9', expected: true, description: 'Add9 chord' },
    { input: 'Fo7', expected: true, description: 'Diminished 7th (o notation)' },
    { input: 'C+', expected: true, description: 'Augmented chord (+ notation)' },
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
    // === Bracketed Chords ===
    { input: '[Em]', expected: true, description: 'Bracketed chord' },
    { input: '[Am7]', expected: true, description: 'Bracketed seventh chord' },
    { input: '[F#m]', expected: true, description: 'Bracketed sharp minor' },
    { input: '[Bb]', expected: true, description: 'Bracketed flat chord' },
    { input: '[E]', expected: true, description: 'Bracketed simple chord' },
    // === Special Markers ===
    { input: '--->', expected: true, description: 'Continuation marker' },
    { input: '-', expected: true, description: 'Single hyphen separator' },
    { input: 'x', expected: true, description: 'Repeat marker' },
    { input: '2', expected: true, description: 'Repeat count' },
    { input: '3', expected: true, description: 'Repeat count' },
    { input: '4', expected: true, description: 'Repeat count' },
    // === Parenthesized (partial tokens) ===
    { input: '(Cm', expected: true, description: 'Opening paren chord' },
    { input: 'Bb)', expected: true, description: 'Closing paren chord' },
    { input: '(Em)', expected: true, description: 'Fully parenthesized chord' },
    // === Invalid Tokens ===
    { input: 'Hello', expected: false, description: 'Regular word' },
    { input: 'X', expected: false, description: 'Invalid note (X)' },
    { input: 'H', expected: false, description: 'Invalid note (H)' },
    { input: 'Cm7b5#9', expected: false, description: 'Complex extension (may fail)' },
    { input: '', expected: false, description: 'Empty string' },
    { input: 'שלום', expected: false, description: 'Hebrew word' },
];
// === RTL Chord Line Reversal Tests ===
const reversalTestCases = [
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
];
function runTests() {
    let totalPassed = 0;
    let totalFailed = 0;
    // Run chord validation tests
    console.log('=== Chord Token Validation Tests ===\n');
    let passed = 0;
    let failed = 0;
    const failures = [];
    for (const testCase of testCases) {
        const actual = isValidChordToken(testCase.input);
        if (actual === testCase.expected) {
            passed++;
            console.log(`✅ PASS: "${testCase.input}" - ${testCase.description}`);
        }
        else {
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
    const reversalFailures = [];
    for (const testCase of reversalTestCases) {
        const actual = reverseChordLineForRtl(testCase.input);
        if (actual === testCase.expected) {
            passed++;
            console.log(`✅ PASS: "${testCase.input}" → "${actual}"`);
        }
        else {
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
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);
    if (totalFailed > 0) {
        console.log('\n❌ Some tests failed!');
        process.exit(1);
    }
    else {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    }
}
runTests();
