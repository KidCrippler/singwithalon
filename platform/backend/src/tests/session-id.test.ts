/**
 * Unit tests for viewer session ID resolution.
 * Run with: npx tsx src/tests/session-id.test.ts
 *
 * Regression target: queue requests from one device were fragmenting into many
 * sessions because the cross-origin cookie was dropped and the server minted a
 * fresh ID per request. The X-Session-Id header (stable client UUID) must take
 * precedence so a device stays one session.
 */

import { resolveSessionId } from '../services/session.js';

interface TestCase {
  description: string;
  header: string | undefined;
  cookie: string | undefined;
  expectedSessionId: string;
  expectedIsNew: boolean;
}

// Deterministic generator so we can assert on the "generated" branch
const FIXED_GENERATED = 'viewer_GENERATED';
const generate = () => FIXED_GENERATED;

const testCases: TestCase[] = [
  {
    description: 'Header present → use header, not new',
    header: 'uuid-from-localstorage',
    cookie: undefined,
    expectedSessionId: 'uuid-from-localstorage',
    expectedIsNew: false,
  },
  {
    description: 'Header takes precedence over cookie',
    header: 'uuid-from-localstorage',
    cookie: 'viewer_123_abc',
    expectedSessionId: 'uuid-from-localstorage',
    expectedIsNew: false,
  },
  {
    description: 'No header but cookie present → use cookie, not new',
    header: undefined,
    cookie: 'viewer_123_abc',
    expectedSessionId: 'viewer_123_abc',
    expectedIsNew: false,
  },
  {
    description: 'Neither present → generate, is new',
    header: undefined,
    cookie: undefined,
    expectedSessionId: FIXED_GENERATED,
    expectedIsNew: true,
  },
  {
    description: 'Empty/whitespace header is ignored → fall back to cookie',
    header: '   ',
    cookie: 'viewer_123_abc',
    expectedSessionId: 'viewer_123_abc',
    expectedIsNew: false,
  },
  {
    description: 'Empty header and no cookie → generate',
    header: '',
    cookie: undefined,
    expectedSessionId: FIXED_GENERATED,
    expectedIsNew: true,
  },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = resolveSessionId(tc.header, tc.cookie, generate);
  const ok =
    result.sessionId === tc.expectedSessionId && result.isNew === tc.expectedIsNew;

  if (ok) {
    passed++;
    console.log(`  ✓ ${tc.description}`);
  } else {
    failed++;
    console.error(`  ✗ ${tc.description}`);
    console.error(
      `      expected { sessionId: ${tc.expectedSessionId}, isNew: ${tc.expectedIsNew} }`
    );
    console.error(
      `      got      { sessionId: ${result.sessionId}, isNew: ${result.isNew} }`
    );
  }
}

console.log(`\nSession ID resolution: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
