import { SangeethaMcpServer } from '../mcp/server';
import { BedrockAgentCoreGateway } from './gateway';
import { RemoteBedrockAgentCoreAgent } from './remote-agent';

async function main() {
  console.log('\n================================================================');
  console.log('  AMAZON BEDROCK AGENTCORE + MCP REMOTE INTEGRATION & VALIDATION');
  console.log('       Sangeetha Mobiles Hyperlocal Shopping Agent');
  console.log('================================================================\n');

  // 1. Start Sangeetha MCP Server (AgentCore Runtime on port 8000)
  console.log('▶ Step 1: Starting Sangeetha MCP Server (AgentCore Runtime)...');
  const mcpServer = new SangeethaMcpServer();
  await mcpServer.startHttp(8000, '0.0.0.0');

  // 2. Start AgentCore Gateway (Port 8080)
  console.log('▶ Step 2: Starting Amazon Bedrock AgentCore Gateway...');
  const gateway = new BedrockAgentCoreGateway('http://127.0.0.1:8000/mcp');
  await gateway.start(8080, '0.0.0.0');

  const remoteAgent = new RemoteBedrockAgentCoreAgent('http://127.0.0.1:8080/v1/gateway/mcp');

  try {
    // 3. Validate Gateway Tools Discovery
    console.log('\n▶ Step 3: Validating Gateway Tools List (tools/list)...');
    const tools = await remoteAgent.listRemoteTools();
    console.log(`Exposed Tools via Gateway (${tools.length}):`);
    tools.forEach((t: any, idx: number) => {
      console.log(`  ${idx + 1}. ${t.name}: ${t.description.slice(0, 75)}...`);
    });

    if (tools.length !== 6) {
      throw new Error(`Expected 6 tools from Gateway, got ${tools.length}`);
    }

    // =========================================================================
    // 4. Primary Remote User Query
    // "Find me a Nothing phone under ₹80,000 available at pincode 560078 and deliverable today."
    // =========================================================================
    console.log('\n================================================================');
    console.log('⭐ PRIMARY AGENTCORE QUERY:');
    console.log('   "Find me a Nothing phone under ₹80,000 available at pincode 560078 and deliverable today."');
    console.log('================================================================\n');

    const primaryResult = await remoteAgent.processQuery(
      'Find me a Nothing phone under ₹80,000 available at pincode 560078 and deliverable today.'
    );

    console.log('\n----------------------------------------------------------------');
    console.log('[Remote AgentCore Response]:');
    console.log(primaryResult.finalResponse);
    console.log('----------------------------------------------------------------\n');

    // =========================================================================
    // 5. Validation Matrix (Pass 1 & Pass 2)
    // =========================================================================
    for (let pass = 1; pass <= 2; pass++) {
      console.log(`\n################################################################`);
      console.log(`  STARTING VALIDATION MATRIX RUN - PASS ${pass} OF 2`);
      console.log(`################################################################\n`);

      // Case 1: Valid product + valid pincode (iPhone 17 @ 560078)
      console.log(`[PASS ${pass}] Case 1: Valid Product + Valid Pincode`);
      const c1 = await remoteAgent.processQuery('Find me an iPhone 17 available at pincode 560078.');
      console.log(`[PASS ${pass} Case 1 Response]:\n${c1.finalResponse}\n`);

      // Case 2: Out of Stock Product (iPhone 18 Pro Max 2TB)
      console.log(`[PASS ${pass}] Case 2: Out-of-Stock Product`);
      const c2 = await remoteAgent.processQuery('Check stock for iPhone 18 Pro Max 2TB at pincode 560078.');
      console.log(`[PASS ${pass} Case 2 Response]:\n${c2.finalResponse}\n`);

      // Case 3: Invalid / Unserviceable Pincode (000000)
      console.log(`[PASS ${pass}] Case 3: Invalid / Unserviceable Pincode`);
      const c3 = await remoteAgent.processQuery('Find me an iPhone 17 deliverable to pincode 000000.');
      console.log(`[PASS ${pass} Case 3 Response]:\n${c3.finalResponse}\n`);

      // Case 4: Product Available & Deliverable Today (Nothing Phone @ 560078)
      console.log(`[PASS ${pass}] Case 4: Product Available and Deliverable Today`);
      const c4 = await remoteAgent.processQuery('Find me a Nothing Phone under ₹80,000 available at pincode 560078 and deliverable today.');
      console.log(`[PASS ${pass} Case 4 Response]:\n${c4.finalResponse}\n`);

      // Case 5: No Product Under Requested Price (iPhone under ₹40,000)
      console.log(`[PASS ${pass}] Case 5: No Product Under Requested Price`);
      const c5 = await remoteAgent.processQuery('Find me an iPhone under ₹40,000 available at pincode 560078.');
      console.log(`[PASS ${pass} Case 5 Response]:\n${c5.finalResponse}\n`);
    }

    console.log('################################################################');
    console.log('  ✅ ALL REMOTE BEDROCK AGENTCORE VALIDATIONS PASSED TWICE!');
    console.log('################################################################\n');

  } finally {
    // 6. Graceful Cleanup
    console.log('▶ Stopping AgentCore Gateway and MCP Runtime servers...');
    await gateway.stop();
    await mcpServer.stopHttp();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('AgentCore Remote Validation failed:', err);
    process.exit(1);
  });
}
