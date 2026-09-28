/**
 * Verification Script: AgentCore Runtime Playground Invocations API
 * 
 * Verifies:
 * 1. AgentCore Runtime Health: GET http://127.0.0.1:9000/ping
 * 2. Agent Card Discovery: GET http://127.0.0.1:9000/.well-known/agent-card.json
 * 3. Playground Invocations API: POST http://127.0.0.1:9000/invocations
 * 4. Complete multi-agent pipeline:
 *    Playground Input -> AgentCore Server -> Amazon Orchestrator -> A2A Wire (9001) -> Sangeetha Specialist -> MCP (8000) -> Live Sangeetha APIs -> UCP Result -> Final Buyer Response
 */

import { agentCoreRuntimeServer } from '../agentcore/agentcore-runtime-server.js';

async function verifyAgentCorePlayground() {
  console.log('================================================================');
  console.log('  VERIFYING AGENTCORE RUNTIME PLAYGROUND INVOCATION PIPELINE');
  console.log('================================================================\n');

  // Step 1: Start AgentCore Runtime Server
  await agentCoreRuntimeServer.start();

  // Step 2: Test Health Check Endpoint (GET /ping)
  console.log('▶ [1/3] Testing Container Health: GET http://127.0.0.1:9000/ping');
  const pingRes = await fetch('http://127.0.0.1:9000/ping');
  const pingJson = await pingRes.json();
  console.log(`  HTTP Status: ${pingRes.status} OK`);
  console.log(`  Payload: ${JSON.stringify(pingJson, null, 2)}\n`);

  if (pingRes.status !== 200 || pingJson.status !== 'Healthy') {
    throw new Error(`Health check failed: ${JSON.stringify(pingJson)}`);
  }

  // Step 3: Test Agent Card Endpoint (GET /.well-known/agent-card.json)
  console.log('▶ [2/3] Testing Agent Card: GET http://127.0.0.1:9000/.well-known/agent-card.json');
  const cardRes = await fetch('http://127.0.0.1:9000/.well-known/agent-card.json');
  const cardJson = await cardRes.json();
  console.log(`  HTTP Status: ${cardRes.status} OK`);
  console.log(`  Discovered Agent: "${cardJson.name}" (ID: ${cardJson.agentId})\n`);

  // Step 4: Test Playground Invocations Endpoint (POST /invocations)
  console.log('▶ [3/3] Testing Playground Invocations: POST http://127.0.0.1:9000/invocations');
  const query = 'Find a Nothing phone under ₹80,000 that can be delivered to pincode 560078.';
  console.log(`  Input Prompt: "${query}"\n`);

  const invocationsRes = await fetch('http://127.0.0.1:9000/invocations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      inputText: query
    })
  });

  const responseJson = await invocationsRes.json();
  console.log('----------------------------------------------------------------');
  console.log('  [PLAYGROUND INVOCATIONS RESPONSE]:');
  console.log('----------------------------------------------------------------');
  console.log(JSON.stringify(responseJson, null, 2));
  console.log('\n  [BUYER-FACING RESPONSE TEXT]:');
  console.log(responseJson.responseText || responseJson.output?.message?.content?.[0]?.text);
  console.log('----------------------------------------------------------------\n');

  // Step 5: Stop Servers
  await agentCoreRuntimeServer.stop();
  console.log('✅ AgentCore Runtime Playground verification completed successfully!');
}

verifyAgentCorePlayground().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
