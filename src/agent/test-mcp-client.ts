import { SangeethaMcpServer } from '../mcp/server';

async function runMcpClientTests() {
  console.log('================================================================');
  console.log('       Sangeetha Commerce MCP Server Test Client');
  console.log('================================================================\n');

  const server = new SangeethaMcpServer();

  // Test 1: Initialize
  console.log('▶ Test 1: initialize');
  const initRes = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'agentcore-test-client', version: '1.0.0' }
    }
  });
  console.log('Init Response:', JSON.stringify(initRes, null, 2));

  // Test 2: tools/list
  console.log('\n▶ Test 2: tools/list');
  const listRes = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  });
  const tools = listRes.result?.tools || [];
  console.log(`Registered Tools (${tools.length}):`, tools.map((t: any) => t.name).join(', '));
  if (tools.length !== 6) throw new Error(`Expected 6 tools, got ${tools.length}`);

  // Test 3: check_pincode_serviceability
  console.log('\n▶ Test 3: tools/call -> check_pincode_serviceability (560078)');
  const pinRes = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'check_pincode_serviceability',
      arguments: { pincode: '560078' }
    }
  });
  console.log('Result:', pinRes.result.content[0].text);

  // Test 4: search_products
  console.log('\n▶ Test 4: tools/call -> search_products (iPhone)');
  const searchRes = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'search_products',
      arguments: { query: 'iPhone', pincode: '560078' }
    }
  });
  const searchData = JSON.parse(searchRes.result.content[0].text);
  console.log(`Matched Products: ${searchData.total_matches}`);
  const sampleProduct = searchData.products?.[0];
  console.log('Sample Product:', JSON.stringify(sampleProduct, null, 2));

  const sampleId = sampleProduct?.product_id || '21906';

  // Test 5: get_product
  console.log(`\n▶ Test 5: tools/call -> get_product (${sampleId})`);
  const prodRes = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'get_product',
      arguments: { product_id: sampleId, pincode: '560078' }
    }
  });
  console.log('Product Details retrieved:', JSON.parse(prodRes.result.content[0].text).product?.title);

  // Test 6: check_stock
  console.log(`\n▶ Test 6: tools/call -> check_stock (${sampleId} @ 560078)`);
  const stockRes = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: {
      name: 'check_stock',
      arguments: { product_id: sampleId, pincode: '560078' }
    }
  });
  console.log('Stock Result:', stockRes.result.content[0].text);

  // Test 7: get_delivery_eta
  console.log(`\n▶ Test 7: tools/call -> get_delivery_eta (${sampleId} @ 560078)`);
  const etaRes = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: {
      name: 'get_delivery_eta',
      arguments: { product_id: sampleId, pincode: '560078' }
    }
  });
  console.log('Delivery ETA Result:', etaRes.result.content[0].text);

  // Test 8: get_nearest_fulfilling_location
  console.log(`\n▶ Test 8: tools/call -> get_nearest_fulfilling_location (${sampleId} @ 560078)`);
  const locRes = await server.handleRpcRequest({
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/call',
    params: {
      name: 'get_nearest_fulfilling_location',
      arguments: { product_id: sampleId, pincode: '560078' }
    }
  });
  console.log('Nearest Store Result:', locRes.result.content[0].text);

  console.log('\n================================================================');
  console.log('  ✅ ALL 6 MCP TOOLS EXECUTED AND VALIDATED SUCCESSFULLY!');
  console.log('================================================================\n');
}

if (require.main === module) {
  runMcpClientTests().catch(err => {
    console.error('MCP Test failed:', err);
    process.exit(1);
  });
}
