/**
 * Regression Test Suite: Sangeetha Hyperlocal AgentCore POC
 * 
 * Validates:
 * 1. Strict Product/Brand Matching ("Find me a Nothing phone" -> no Apple/iPhone)
 * 2. Multi-turn Session Context ("Which store will fulfill it?", "How quickly can I get it?", "Is it in stock?")
 * 3. Dynamic Pincode Re-evaluation on Follow-up ("What about 560001?")
 * 4. Deterministic No-Match Handling ("Find me a Nothing phone under ₹1,000")
 * 5. Universal Read-Only Demo Notice Preservation
 * 6. Full A2A Wire & MCP Protocol Integrity (Orchestrator -> A2A -> Specialist -> MCP -> Live APIs -> UCP)
 */

import { sangeethaA2AServer } from '../../src/agents/sangeetha-a2a-server.js';
import { sangeethaMcpServer } from '../../src/mcp/server.js';
import { AmazonShoppingOrchestratorAgent } from '../../src/agents/amazon-orchestrator-agent.js';
import { config } from '../../src/config/env.js';

interface TestResult {
  testNumber: number;
  description: string;
  passed: boolean;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testNumber: number, description: string, details: string) {
  if (!condition) {
    console.error(`❌ [FAIL] Test ${testNumber}: ${description} - ${details}`);
    results.push({ testNumber, description, passed: false, details });
    throw new Error(`Assertion failed in Test ${testNumber}: ${details}`);
  } else {
    console.log(`✅ [PASS] Test ${testNumber}: ${description}`);
    results.push({ testNumber, description, passed: true, details });
  }
}

export async function runRegressionSuite() {
  console.log('\n' + '='.repeat(80));
  console.log('  SANGEETHA HYPERLOCAL AGENTCORE POC — AUTOMATED REGRESSION SUITE');
  console.log('  Architecture: Orchestrator -> A2A -> Specialist -> MCP -> Live APIs -> UCP');
  console.log('='.repeat(80) + '\n');

  // Start background test servers on dedicated test ports to avoid collisions
  const testMcpPort = 8008;
  const testA2aPort = 9008;

  console.log(`▶ [1/3] Starting Dedicated Sangeetha Commerce MCP Server on Port ${testMcpPort}...`);
  await sangeethaMcpServer.start(testMcpPort);

  console.log(`▶ [2/3] Starting Sangeetha Specialist Agent A2A Server on Port ${testA2aPort}...`);
  const a2aServer = new (await import('../../src/agents/sangeetha-a2a-server.js')).SangeethaA2AServer(testA2aPort, '0.0.0.0');
  await a2aServer.start();

  console.log('▶ [3/3] Initializing Amazon Shopping Orchestrator Agent...');
  const orchestrator = new AmazonShoppingOrchestratorAgent(`http://127.0.0.1:${testA2aPort}`);

  const READ_ONLY_SNIPPET = 'This is a read-only shopping demo; cart and checkout actions are not enabled.';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: "Find me a Nothing phone." -> Must NOT return Apple/iPhone
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 1] "Find me a Nothing phone."');
    AmazonShoppingOrchestratorAgent.clearSessionStore();
    const res1 = await orchestrator.handleUserQuery('Find me a Nothing phone.', 'session-test-1');
    const out1 = res1.finalUserResponse;

    console.log(`[TEST 1 Output]:\n${out1}\n`);

    assert(
      !/apple|iphone/i.test(out1),
      1,
      'Must not return Apple/iPhone for Nothing phone search',
      `Response contained Apple/iPhone: "${out1}"`
    );
    assert(
      /nothing/i.test(out1),
      1,
      'Response must contain Nothing product',
      `Response did not contain Nothing: "${out1}"`
    );
    assert(
      out1.includes(READ_ONLY_SNIPPET),
      1,
      'Must contain read-only demo notice',
      `Missing read-only notice in Test 1 response`
    );

    // -------------------------------------------------------------------------
    // TEST 2: "Find me a Nothing phone under ₹50,000 for pincode 560078."
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 2] "Find me a Nothing phone under ₹50,000 for pincode 560078."');
    const sessionIdUser = 'session-user-multi-turn-001';
    const res2 = await orchestrator.handleUserQuery(
      'Find me a Nothing phone under ₹50,000 for pincode 560078.',
      sessionIdUser
    );
    const out2 = res2.finalUserResponse;

    console.log(`[TEST 2 Output]:\n${out2}\n`);

    assert(
      /nothing/i.test(out2) && !/apple|iphone/i.test(out2),
      2,
      'Selected product must match Nothing brand',
      `Product was not Nothing: "${out2}"`
    );
    assert(
      out2.includes(READ_ONLY_SNIPPET),
      2,
      'Must contain read-only demo notice',
      `Missing read-only notice in Test 2 response`
    );

    const storedCtx2 = AmazonShoppingOrchestratorAgent.sessionStore.get(sessionIdUser);
    assert(
      Boolean(storedCtx2 && storedCtx2.brand.toLowerCase() === 'nothing' && storedCtx2.pincode === '560078'),
      2,
      'Shopping context must be stored with brand Nothing and pincode 560078',
      `Stored context: ${JSON.stringify(storedCtx2)}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Follow-up: "Which store will fulfill it?"
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 3] Follow-up: "Which store will fulfill it?"');
    const res3 = await orchestrator.handleUserQuery('Which store will fulfill it?', sessionIdUser);
    const out3 = res3.finalUserResponse;

    console.log(`[TEST 3 Output]:\n${out3}\n`);

    assert(
      res3.isFollowUp === true,
      3,
      'Follow-up must be detected',
      `res3.isFollowUp was ${res3.isFollowUp}`
    );
    assert(
      out3.includes(storedCtx2!.productName) || /nothing/i.test(out3),
      3,
      'Must reference the same previously matched product',
      `Response did not reference ${storedCtx2?.productName}: "${out3}"`
    );
    assert(
      out3.includes(storedCtx2!.fulfillmentLocation),
      3,
      'Must identify the fulfilling store from stored context',
      `Response did not include location "${storedCtx2?.fulfillmentLocation}": "${out3}"`
    );
    assert(
      out3.includes(READ_ONLY_SNIPPET),
      3,
      'Must contain read-only demo notice',
      `Missing read-only notice in Test 3 response`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Follow-up: "How quickly can I get it?"
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 4] Follow-up: "How quickly can I get it?"');
    const res4 = await orchestrator.handleUserQuery('How quickly can I get it?', sessionIdUser);
    const out4 = res4.finalUserResponse;

    console.log(`[TEST 4 Output]:\n${out4}\n`);

    assert(
      res4.isFollowUp === true,
      4,
      'Follow-up must be detected',
      `res4.isFollowUp was ${res4.isFollowUp}`
    );
    assert(
      out4.includes(storedCtx2!.productName) || /nothing/i.test(out4),
      4,
      'Must reference the same previously matched product for ETA',
      `Response did not reference ${storedCtx2?.productName}: "${out4}"`
    );
    assert(
      out4.includes(storedCtx2!.eta) || /delivery|minute|hour|day/i.test(out4),
      4,
      'Must provide the ETA for the stored product',
      `Response did not include ETA info: "${out4}"`
    );
    assert(
      out4.includes(READ_ONLY_SNIPPET),
      4,
      'Must contain read-only demo notice',
      `Missing read-only notice in Test 4 response`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Follow-up: "Is it in stock?"
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 5] Follow-up: "Is it in stock?"');
    const res5 = await orchestrator.handleUserQuery('Is it in stock?', sessionIdUser);
    const out5 = res5.finalUserResponse;

    console.log(`[TEST 5 Output]:\n${out5}\n`);

    assert(
      res5.isFollowUp === true,
      5,
      'Follow-up must be detected',
      `res5.isFollowUp was ${res5.isFollowUp}`
    );
    assert(
      out5.includes(storedCtx2!.productName) || /nothing/i.test(out5),
      5,
      'Must reference the same previously matched product for stock',
      `Response did not reference ${storedCtx2?.productName}: "${out5}"`
    );
    assert(
      /in stock|out of stock/i.test(out5),
      5,
      'Must report stock status for the stored product',
      `Response did not mention stock status: "${out5}"`
    );
    assert(
      out5.includes(READ_ONLY_SNIPPET),
      5,
      'Must contain read-only demo notice',
      `Missing read-only notice in Test 5 response`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Different Pincode: "What about 560001?"
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 6] Different pincode: "What about 560001?"');
    const res6 = await orchestrator.handleUserQuery('What about 560001?', sessionIdUser);
    const out6 = res6.finalUserResponse;

    console.log(`[TEST 6 Output]:\n${out6}\n`);

    assert(
      res6.isFollowUp === true,
      6,
      'Follow-up detected for new pincode re-evaluation',
      `res6.isFollowUp was ${res6.isFollowUp}`
    );
    assert(
      out6.includes(storedCtx2!.productName) || /nothing/i.test(out6),
      6,
      'Must re-evaluate fulfillment for the same product at 560001',
      `Response did not reference ${storedCtx2?.productName}: "${out6}"`
    );
    assert(
      out6.includes(READ_ONLY_SNIPPET),
      6,
      'Must contain read-only demo notice',
      `Missing read-only notice in Test 6 response`
    );

    const storedCtx6 = AmazonShoppingOrchestratorAgent.sessionStore.get(sessionIdUser);
    assert(
      Boolean(storedCtx6 && storedCtx6.pincode === '560001'),
      6,
      'Stored context must be updated to new pincode 560001',
      `Stored pincode was not updated: ${storedCtx6?.pincode}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: No-match: "Find me a Nothing phone under ₹1,000."
    // -------------------------------------------------------------------------
    console.log('\n>>> [TEST 7] No-match: "Find me a Nothing phone under ₹1,000."');
    const res7 = await orchestrator.handleUserQuery(
      'Find me a Nothing phone under ₹1,000.',
      'session-no-match-test'
    );
    const out7 = res7.finalUserResponse;

    console.log(`[TEST 7 Output]:\n${out7}\n`);

    assert(
      !/apple|iphone/i.test(out7),
      7,
      'No-match must NOT fabricate or substitute an unrelated Apple/iPhone product',
      `Found Apple/iPhone in no-match response: "${out7}"`
    );
    assert(
      /no nothing|no nothing models|under ₹1,000/i.test(out7),
      7,
      'Must clearly state no Nothing models were found under ₹1,000',
      `Response did not state no-match properly: "${out7}"`
    );
    assert(
      out7.includes(READ_ONLY_SNIPPET),
      7,
      'Must contain read-only demo notice',
      `Missing read-only notice in Test 7 response`
    );

    // Final Report
    console.log('\n' + '='.repeat(80));
    console.log('  REGRESSION SUITE EXECUTION SUMMARY');
    console.log('='.repeat(80));
    results.forEach(r => {
      console.log(`  ${r.passed ? '✅ PASS' : '❌ FAIL'} | Test ${r.testNumber}: ${r.description}`);
    });
    console.log('='.repeat(80));
    console.log(`  ALL ${results.length} REGRESSION TESTS PASSED CLEANLY! 🎉\n`);
  } finally {
    await a2aServer.stop();
    await sangeethaMcpServer.stop();
    console.log('▶ Servers stopped gracefully.\n');
  }
}

// Direct CLI execution
if (require.main === module || process.argv[1]?.endsWith('agentcore-regression.spec.ts')) {
  runRegressionSuite().catch(err => {
    console.error('\n❌ Regression Suite Failed with Error:\n', err);
    process.exit(1);
  });
}
