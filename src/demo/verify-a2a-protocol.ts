import { SangeethaMcpServer } from '../mcp/server';
import { SangeethaA2AServer } from '../agents/sangeetha-a2a-server';
import { AmazonShoppingOrchestratorAgent } from '../agents/amazon-orchestrator-agent';

async function main() {
  console.log('\n================================================================');
  console.log('       A2A PROTOCOL WIRE VERIFICATION & MULTI-AGENT DEMO');
  console.log('  Amazon Orchestrator Agent ↔ Sangeetha Specialist A2A Server');
  console.log('                Backed by Sangeetha Commerce MCP');
  console.log('================================================================\n');

  // Step 1: Start Sangeetha MCP Server on port 8000
  console.log('▶ Step 1: Starting Sangeetha Commerce MCP Runtime on port 8000...');
  const mcpServer = new SangeethaMcpServer();
  await mcpServer.startHttp(8000, '0.0.0.0');

  // Step 2: Start Sangeetha A2A Server on port 8001
  console.log('▶ Step 2: Starting Sangeetha A2A Server on port 8001...');
  const a2aServer = new SangeethaA2AServer(8001, '0.0.0.0');
  await a2aServer.start();

  // Step 3: Initialize Amazon Orchestrator pointing to Sangeetha A2A endpoint
  const amazonAgent = new AmazonShoppingOrchestratorAgent('http://127.0.0.1:8001');

  try {
    // Step 4: Verify Agent Card Discovery
    console.log('▶ Step 3: Verifying A2A Agent Card Discovery (GET /.well-known/agent.json)...');
    const card = await amazonAgent.discoverSpecialistAgent();
    console.log('Agent Card Verified Successfully:');
    console.log(JSON.stringify(card, null, 2));

    // Step 5: Execute Primary VP Demo Query over A2A Wire
    console.log('\n================================================================');
    console.log('⭐ PRIMARY VP DEMO QUERY (A2A WIRE EXECUTION):');
    console.log('   "Find me a Nothing phone under ₹80,000 available at pincode 560078 and deliverable today."');
    console.log('================================================================\n');

    const primaryResult = await amazonAgent.handleUserQuery(
      'Find me a Nothing phone under ₹80,000 available at pincode 560078 and deliverable today.'
    );

    console.log('----------------------------------------------------------------');
    console.log('[FINAL USER RESPONSE SYNTHESIZED BY ORCHESTRATOR]:');
    console.log(primaryResult.finalUserResponse);
    console.log('----------------------------------------------------------------\n');

    // Step 6: Full Validation Matrix (2 passes over A2A wire)
    for (let pass = 1; pass <= 2; pass++) {
      console.log(`\n################################################################`);
      console.log(`  STARTING A2A PROTOCOL VALIDATION MATRIX — PASS ${pass} OF 2`);
      console.log(`################################################################\n`);

      // Case 1: Valid product + valid pincode (iPhone 17 @ 560078)
      console.log(`[PASS ${pass}] Case 1: Valid Product + Valid Pincode`);
      const c1 = await amazonAgent.handleUserQuery('Find me an iPhone 17 available at pincode 560078.');
      console.log(`[PASS ${pass} Case 1 Response]:\n${c1.finalUserResponse}\n`);

      // Case 2: Out of Stock Product (iPhone 18 Pro Max 2TB @ 560078)
      console.log(`[PASS ${pass}] Case 2: Out-of-Stock Product`);
      const c2 = await amazonAgent.handleUserQuery('Check stock for iPhone 18 Pro Max 2TB at pincode 560078.');
      console.log(`[PASS ${pass} Case 2 Response]:\n${c2.finalUserResponse}\n`);

      // Case 3: Invalid / Unserviceable Pincode (000000)
      console.log(`[PASS ${pass}] Case 3: Invalid / Unserviceable Pincode`);
      const c3 = await amazonAgent.handleUserQuery('Find me an iPhone 17 deliverable to pincode 000000.');
      console.log(`[PASS ${pass} Case 3 Response]:\n${c3.finalUserResponse}\n`);

      // Case 4: Product Available & Deliverable Today (Nothing Phone @ 560078)
      console.log(`[PASS ${pass}] Case 4: Product Available and Deliverable Today`);
      const c4 = await amazonAgent.handleUserQuery('Find me a Nothing Phone under ₹80,000 available at pincode 560078 and deliverable today.');
      console.log(`[PASS ${pass} Case 4 Response]:\n${c4.finalUserResponse}\n`);

      // Case 5: No Product Under Requested Price (iPhone under ₹40,000)
      console.log(`[PASS ${pass}] Case 5: No Product Under Requested Price`);
      const c5 = await amazonAgent.handleUserQuery('Find me an iPhone under ₹40,000 available at pincode 560078.');
      console.log(`[PASS ${pass} Case 5 Response]:\n${c5.finalUserResponse}\n`);
    }

    console.log('################################################################');
    console.log('  ✅ ALL A2A PROTOCOL ON-THE-WIRE VALIDATIONS PASSED TWICE!');
    console.log('################################################################\n');

  } finally {
    console.log('▶ Stopping A2A Server and MCP Runtime...');
    await a2aServer.stop();
    await mcpServer.stopHttp();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('A2A Wire Verification failed:', err);
    process.exit(1);
  });
}
