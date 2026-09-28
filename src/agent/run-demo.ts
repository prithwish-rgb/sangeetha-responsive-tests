import { BedrockAgentCoreOrchestrator } from './agentcore-orchestrator';

async function runValidationMatrix() {
  const agent = new BedrockAgentCoreOrchestrator();

  console.log('\n################################################################');
  console.log('  AMAZON BEDROCK AGENTCORE + MCP HYPERLOCAL SHOPPING AGENT DEMO');
  console.log('       Sangeetha Mobiles Hyperlocal Commerce POC');
  console.log('################################################################\n');

  // =========================================================================
  // Primary VP Demo Query
  // =========================================================================
  console.log('================================================================');
  console.log('⭐ PRIMARY VP DEMO CASE:');
  console.log('   "Find me an iPhone under ₹80,000 available at pincode 560078 and deliverable today."');
  console.log('================================================================');

  const vpResult = await agent.processUserQuery('Find me an iPhone under ₹80,000 available at pincode 560078 and deliverable today.');
  console.log('\n[Agent Response]:');
  console.log(vpResult.final_response);
  console.log('\n----------------------------------------------------------------\n');

  // =========================================================================
  // Scenario A: Valid product + valid pincode
  // =========================================================================
  console.log('================================================================');
  console.log('TEST CASE A: Valid Product + Valid Pincode (In-Stock & Deliverable)');
  console.log('   "Find me an iPhone 17 available at pincode 560078."');
  console.log('================================================================');

  const caseAResult = await agent.processUserQuery('Find me an iPhone 17 available at pincode 560078.');
  console.log('\n[Agent Response]:');
  console.log(caseAResult.final_response);
  console.log('\n----------------------------------------------------------------\n');

  // =========================================================================
  // Scenario B: Product Out of Stock
  // =========================================================================
  console.log('================================================================');
  console.log('TEST CASE B: Product Out of Stock');
  console.log('   "Check stock for iPhone 18 Pro Max 2TB at pincode 560078."');
  console.log('================================================================');

  const caseBResult = await agent.processUserQuery('Check stock for iPhone 18 Pro Max 2TB at pincode 560078.');
  console.log('\n[Agent Response]:');
  console.log(caseBResult.final_response);
  console.log('\n----------------------------------------------------------------\n');

  // =========================================================================
  // Scenario C: Invalid / Unserviceable Pincode
  // =========================================================================
  console.log('================================================================');
  console.log('TEST CASE C: Invalid / Unserviceable Pincode');
  console.log('   "Find me an iPhone 17 deliverable to pincode 000000."');
  console.log('================================================================');

  const caseCResult = await agent.processUserQuery('Find me an iPhone 17 deliverable to pincode 000000.');
  console.log('\n[Agent Response]:');
  console.log(caseCResult.final_response);
  console.log('\n----------------------------------------------------------------\n');

  // =========================================================================
  // Scenario D: Alternative Phone with Budget Constraint
  // =========================================================================
  console.log('================================================================');
  console.log('TEST CASE D: Alternative Phone Under ₹80,000 (In-Stock & Deliverable)');
  console.log('   "Find me a smartphone under ₹80,000 available at pincode 560078 and deliverable today."');
  console.log('================================================================');

  const caseDResult = await agent.processUserQuery('Find me a Nothing Phone under ₹80,000 available at pincode 560078 and deliverable today.');
  console.log('\n[Agent Response]:');
  console.log(caseDResult.final_response);
  console.log('\n----------------------------------------------------------------\n');

  // =========================================================================
  // Scenario E: No Product Under Requested Price
  // =========================================================================
  console.log('================================================================');
  console.log('TEST CASE E: No Product Under Requested Price');
  console.log('   "Find me an iPhone under ₹40,000 available at pincode 560078."');
  console.log('================================================================');

  const caseEResult = await agent.processUserQuery('Find me an iPhone under ₹40,000 available at pincode 560078.');
  console.log('\n[Agent Response]:');
  console.log(caseEResult.final_response);
  console.log('\n----------------------------------------------------------------\n');

  console.log('################################################################');
  console.log('  ✅ ALL VALIDATION MATRIX SCENARIOS COMPLETED SUCCESSFULLY!');
  console.log('################################################################\n');
}

if (require.main === module) {
  runValidationMatrix().catch(err => {
    console.error('Demo run failed:', err);
    process.exit(1);
  });
}
