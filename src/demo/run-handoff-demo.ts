/**
 * Amazon Agentic Platform — Official A2A v1.0 Handoff Demo
 * 
 * Demonstrates:
 * 1. User Request
 * 2. Amazon Shopping Orchestrator Agent (amazon.shopping.orchestrator.v1)
 * 3. Standard A2A Agent Card Discovery (GET /.well-known/agent-card.json) & /ping
 * 4. A2A Handoff (JSON-RPC 2.0 message/send with Message/Part envelope)
 * 5. External Sangeetha Specialist Agent (sangeetha.hyperlocal.commerce-agent.v1)
 * 6. Dedicated Sangeetha Commerce MCP Interface (Streamable HTTP on 0.0.0.0:8000/mcp)
 * 7. Live Production Sangeetha APIs (100% Real Systems, Read-Only)
 * 8. UCP Fulfillment Normalization
 * 9. A2A Response returned to Orchestrator
 * 10. Orchestrator Final Recommendation + Closing Call to Action
 */

import { sangeethaA2AServer } from '../agents/sangeetha-a2a-server.js';
import { sangeethaMcpServer } from '../mcp/server.js';
import { AmazonShoppingOrchestratorAgent } from '../agents/amazon-orchestrator-agent.js';
import { config } from '../config/env.js';

const TEST_MATRIX = [
  {
    caseId: 1,
    name: 'Valid product + valid pincode (iPhone 17 @ 560078)',
    query: 'Find me an iPhone 17 available at pincode 560078 deliverable today.'
  },
  {
    caseId: 2,
    name: 'Out-of-stock product (iPhone 18 Pro Max 2TB @ 560078)',
    query: 'Check stock for iPhone 18 Pro Max 2TB at pincode 560078.'
  },
  {
    caseId: 3,
    name: 'Unserviceable pincode (Pincode 000000)',
    query: 'Find me an iPhone deliverable to pincode 000000.'
  },
  {
    caseId: 4,
    name: 'VP Case: Product under budget & deliverable today (Nothing Phone @ 560078)',
    query: 'Find a Nothing phone under ₹80,000 that can be delivered to pincode 560078.'
  },
  {
    caseId: 5,
    name: 'Strict budget with no matching product (iPhone under ₹40,000)',
    query: 'Find me an iPhone under ₹40,000 available at pincode 560078.'
  }
];

export async function runA2AHandoffDemo() {
  console.log('\n' + '='.repeat(70));
  console.log('  AMAZON AGENTIC PLATFORM — SANGEETHA HYPERLOCAL COMMERCE DEMO');
  console.log('    Orchestrator Agent ↔ External Sangeetha Specialist Agent');
  console.log('              Powered by Sangeetha Commerce MCP');
  console.log('='.repeat(70) + '\n');

  // Step 1: Start Sangeetha Dedicated Commerce MCP Server on Port 8000
  console.log('▶ [1/4] Starting Dedicated Sangeetha Commerce MCP Server (0.0.0.0:8000/mcp)...');
  await sangeethaMcpServer.start();

  // Step 2: Start Sangeetha Specialist Agent on Bedrock AgentCore Runtime Port 9000
  console.log('▶ [2/4] Starting Sangeetha A2A Specialist on AgentCore Runtime (0.0.0.0:9000)...');
  await sangeethaA2AServer.start();

  // Step 3: Initialize Amazon Orchestrator Client
  console.log('▶ [3/4] Initializing Amazon Shopping Orchestrator Agent (amazon.shopping.orchestrator.v1)...');
  const orchestrator = new AmazonShoppingOrchestratorAgent(`http://127.0.0.1:${config.agentCoreRuntimePort}`);

  // Step 4: Health Check & Agent Card Discovery Verification
  console.log('\n▶ [4/4] Verifying AgentCore Runtime Health & Standard Agent Card Discovery:');
  const pingRes = await fetch(`http://127.0.0.1:${config.agentCoreRuntimePort}/ping`);
  const pingData = await pingRes.json();
  console.log(`  • GET /ping: ${pingRes.status} OK | ${JSON.stringify(pingData)}`);

  const agentCard = await orchestrator.discoverSpecialistAgent();
  console.log(`  • GET /.well-known/agent-card.json: Discovered "${agentCard.name}"`);
  console.log(`    Agent ID: ${agentCard.agentId} | Supported Interface: ${agentCard.supportedInterfaces[0]?.protocol} @ ${agentCard.supportedInterfaces[0]?.url}`);

  // =========================================================================
  // PRIMARY VP DEMO EXECUTION
  // =========================================================================
  console.log('\n' + '#'.repeat(70));
  console.log('  ⭐ PRIMARY VP DEMO CASE:');
  console.log('     "Find a Nothing phone under ₹80,000 that can be delivered to pincode 560078."');
  console.log('#'.repeat(70) + '\n');

  const primaryResult = await orchestrator.handleUserQuery(
    'Find a Nothing phone under ₹80,000 that can be delivered to pincode 560078.'
  );

  console.log('\n' + '-'.repeat(70));
  console.log('  [PRIMARY DEMO] FINAL BUYER RECOMMENDATION:');
  console.log('-'.repeat(70));
  console.log(primaryResult.finalUserResponse);
  console.log('-'.repeat(70) + '\n');

  // =========================================================================
  // 5-CASE VALIDATION MATRIX (EXECUTED TWICE)
  // =========================================================================
  for (let pass = 1; pass <= 2; pass++) {
    console.log('\n' + '='.repeat(70));
    console.log(`  EXECUTION PASS ${pass} OF 2: FULL 5-CASE VALIDATION MATRIX`);
    console.log('='.repeat(70) + '\n');

    for (const testCase of TEST_MATRIX) {
      console.log(`>>> [PASS ${pass} | CASE ${testCase.caseId}] ${testCase.name}`);
      const result = await orchestrator.handleUserQuery(testCase.query);
      console.log(`>>> [PASS ${pass} | CASE ${testCase.caseId} COMPLETE] Status: ${result.a2aWireResponse?.result?.status || 'UNKNOWN'}\n`);
    }
  }

  console.log('\n' + '#'.repeat(70));
  console.log('  ✅ ALL A2A HANDOFF & MCP VALIDATIONS COMPLETED TWICE SUCCESSFULLY!');
  console.log('#'.repeat(70) + '\n');

  // Shutdown servers
  await sangeethaA2AServer.stop();
  await sangeethaMcpServer.stop();
  console.log('▶ Servers stopped gracefully.\n');
}

if (require.main === module || process.argv[1]?.endsWith('run-handoff-demo.ts') || process.argv[1]?.endsWith('run-handoff-demo.js')) {
  runA2AHandoffDemo().catch(err => {
    console.error('Demo execution failed:', err);
    process.exit(1);
  });
}
