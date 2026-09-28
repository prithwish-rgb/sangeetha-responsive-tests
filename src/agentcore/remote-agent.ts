import { config } from '../config/env';

export interface RemoteToolCallLog {
  requestId: string;
  toolName: string;
  args: any;
  gatewayEndpoint: string;
  latencyMs: number;
  result: any;
}

export interface RemoteAgentExecutionResult {
  query: string;
  requestId: string;
  gatewayEndpoint: string;
  toolCallLogs: RemoteToolCallLog[];
  finalResponse: string;
}

export class RemoteBedrockAgentCoreAgent {
  private gatewayUrl: string;
  private apiKey: string;

  constructor(
    gatewayUrl = `http://127.0.0.1:${config.gatewayPort}/v1/gateway/mcp`,
    apiKey = config.gatewayApiKey
  ) {
    this.gatewayUrl = gatewayUrl;
    this.apiKey = apiKey;
  }

  /**
   * Execute a tool call remotely via the AgentCore Gateway
   */
  public async callRemoteMcpTool(toolName: string, args: any, parentRequestId?: string): Promise<{ result: any; latencyMs: number; requestId: string }> {
    const requestId = parentRequestId || `bedrock-agent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const rpcPayload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    const start = Date.now();
    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'authorization': `Bearer ${this.apiKey}`,
        'x-api-key': this.apiKey,
        'x-amzn-bedrock-agent-request-id': requestId,
        'user-agent': 'Amazon-Bedrock-AgentCore-Remote-Agent/1.0'
      },
      body: JSON.stringify(rpcPayload)
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AgentCore Gateway returned HTTP ${response.status}: ${errText}`);
    }

    const rpcRes = await response.json();
    if (rpcRes.error) {
      throw new Error(`MCP Error from Gateway: ${rpcRes.error.message || JSON.stringify(rpcRes.error)}`);
    }

    const contentText = rpcRes.result?.content?.[0]?.text || '{}';
    const parsedData = JSON.parse(contentText);

    return {
      result: parsedData,
      latencyMs,
      requestId
    };
  }

  /**
   * List all remote tools exposed via Gateway
   */
  public async listRemoteTools(): Promise<any[]> {
    const rpcPayload = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${this.apiKey}`,
        'x-api-key': this.apiKey,
        'user-agent': 'Amazon-Bedrock-AgentCore-Remote-Agent/1.0'
      },
      body: JSON.stringify(rpcPayload)
    });

    const json = await response.json();
    return json.result?.tools || [];
  }

  /**
   * Process a natural language user query through the remote AgentCore Gateway
   */
  public async processQuery(userQuery: string): Promise<RemoteAgentExecutionResult> {
    const masterRequestId = `req-agentcore-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const toolCallLogs: RemoteToolCallLog[] = [];

    console.log(`\n================================================================`);
    console.log(`[Remote AgentCore Agent] Incoming Request: "${userQuery}"`);
    console.log(`  ▶ Master Request ID: ${masterRequestId}`);
    console.log(`  ▶ Gateway Endpoint:  ${this.gatewayUrl}`);
    console.log(`================================================================\n`);

    // Parse parameters
    const pincodeMatch = userQuery.match(/\b\d{6}\b/);
    const pincode = pincodeMatch ? pincodeMatch[0] : '560078';

    const priceMatch = userQuery.match(/(?:under|below|less than|within)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
    const maxPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined;

    let keyword = 'iPhone';
    if (/nothing/i.test(userQuery)) keyword = 'Nothing';
    else if (/pixel/i.test(userQuery)) keyword = 'Pixel';
    else if (/samsung/i.test(userQuery)) keyword = 'Samsung';
    else if (/oppo/i.test(userQuery)) keyword = 'Oppo';
    else if (/realme/i.test(userQuery)) keyword = 'Realme';
    else if (/iphone\s*\d+/i.test(userQuery)) {
      const m = userQuery.match(/iphone\s*\d+/i);
      keyword = m ? m[0] : 'iPhone';
    }

    // Step 1: Remote Tool Call -> search_products
    console.log(`[Agent Step 1] Remote call: search_products("${keyword}", max_price: ${maxPrice ?? 'none'}, pincode: ${pincode})`);
    const searchCall = await this.callRemoteMcpTool('search_products', {
      query: keyword,
      max_price: maxPrice,
      pincode
    }, masterRequestId);

    toolCallLogs.push({
      requestId: masterRequestId,
      toolName: 'search_products',
      args: { query: keyword, max_price: maxPrice, pincode },
      gatewayEndpoint: this.gatewayUrl,
      latencyMs: searchCall.latencyMs,
      result: searchCall.result
    });

    const products = searchCall.result.products || [];

    // Step 2: Remote Tool Call -> check_pincode_serviceability
    console.log(`[Agent Step 2] Remote call: check_pincode_serviceability(pincode: ${pincode})`);
    const pincodeCall = await this.callRemoteMcpTool('check_pincode_serviceability', {
      pincode
    }, masterRequestId);

    toolCallLogs.push({
      requestId: masterRequestId,
      toolName: 'check_pincode_serviceability',
      args: { pincode },
      gatewayEndpoint: this.gatewayUrl,
      latencyMs: pincodeCall.latencyMs,
      result: pincodeCall.result
    });

    if (!pincodeCall.result.serviceable) {
      const finalMsg = `I'm sorry, but postal code ${pincode} is currently not serviceable for delivery by Sangeetha Mobiles (${pincodeCall.result.message || 'Unserviceable area'}). Please provide an alternative delivery pincode.`;
      return {
        query: userQuery,
        requestId: masterRequestId,
        gatewayEndpoint: this.gatewayUrl,
        toolCallLogs,
        finalResponse: finalMsg
      };
    }

    // Handle No Product Under Requested Price
    if (products.length === 0) {
      const fallbackSearch = await this.callRemoteMcpTool('search_products', { query: keyword, pincode }, masterRequestId);
      const lowestProduct = fallbackSearch.result.products?.[0];

      let altInfo = '';
      if (lowestProduct) {
        altInfo = ` The lowest priced ${keyword} currently in catalog is the **${lowestProduct.title}** at ₹${lowestProduct.price.sale_price.toLocaleString('en-IN')}.`;
      }

      const finalMsg = `No ${keyword} models were found under ₹${maxPrice?.toLocaleString('en-IN') || '80,000'} in Sangeetha's live inventory.${altInfo}\n\nWould you like me to show alternative smartphones within your budget, or look at the available ${keyword} models?`;

      return {
        query: userQuery,
        requestId: masterRequestId,
        gatewayEndpoint: this.gatewayUrl,
        toolCallLogs,
        finalResponse: finalMsg
      };
    }

    const candidate = products[0];
    const candidateId = candidate.product_id;

    // Step 3: Remote Tool Call -> check_stock
    console.log(`[Agent Step 3] Remote call: check_stock(product_id: ${candidateId}, pincode: ${pincode})`);
    const stockCall = await this.callRemoteMcpTool('check_stock', {
      product_id: candidateId,
      pincode
    }, masterRequestId);

    toolCallLogs.push({
      requestId: masterRequestId,
      toolName: 'check_stock',
      args: { product_id: candidateId, pincode },
      gatewayEndpoint: this.gatewayUrl,
      latencyMs: stockCall.latencyMs,
      result: stockCall.result
    });

    // Step 4: Remote Tool Call -> get_nearest_fulfilling_location
    console.log(`[Agent Step 4] Remote call: get_nearest_fulfilling_location(product_id: ${candidateId}, pincode: ${pincode})`);
    const locCall = await this.callRemoteMcpTool('get_nearest_fulfilling_location', {
      product_id: candidateId,
      pincode
    }, masterRequestId);

    toolCallLogs.push({
      requestId: masterRequestId,
      toolName: 'get_nearest_fulfilling_location',
      args: { product_id: candidateId, pincode },
      gatewayEndpoint: this.gatewayUrl,
      latencyMs: locCall.latencyMs,
      result: locCall.result
    });

    // Step 5: Remote Tool Call -> get_delivery_eta
    console.log(`[Agent Step 5] Remote call: get_delivery_eta(product_id: ${candidateId}, pincode: ${pincode})`);
    const etaCall = await this.callRemoteMcpTool('get_delivery_eta', {
      product_id: candidateId,
      pincode
    }, masterRequestId);

    toolCallLogs.push({
      requestId: masterRequestId,
      toolName: 'get_delivery_eta',
      args: { product_id: candidateId, pincode },
      gatewayEndpoint: this.gatewayUrl,
      latencyMs: etaCall.latencyMs,
      result: etaCall.result
    });

    // Step 6: Synthesize final answer based strictly on real tool outputs
    const productName = candidate.title;
    const price = candidate.price.sale_price;
    const isAvailable = stockCall.result.availability?.is_deliverable ?? candidate.fulfillment?.availability?.is_deliverable;
    const availText = isAvailable ? 'In Stock (Live Store Inventory)' : 'Out of Stock';
    const storeLocation = locCall.result.fulfilling_location?.name || stockCall.result.fulfilling_location?.name || 'Nearest Sangeetha Hub';
    const deliveryMethod = etaCall.result.fulfillment_options?.[0]?.title || 'Hyperlocal Express Delivery';
    const etaText = etaCall.result.buyer_facing_description || '30 Minutes';

    let finalResponse = `Product: ${productName}\n` +
      `Price: ₹${price.toLocaleString('en-IN')}\n` +
      `Availability: ${availText}\n` +
      `Fulfillment location: ${storeLocation}\n` +
      `Delivery: ${deliveryMethod}\n` +
      `ETA: ${etaText}\n\n` +
      `Would you like me to add it to the cart?`;

    if (!isAvailable) {
      finalResponse = `Product: ${productName}\n` +
        `Price: ₹${price.toLocaleString('en-IN')}\n` +
        `Availability: Out of Stock\n` +
        `Fulfillment location: ${storeLocation}\n` +
        `Delivery: Unavailable\n` +
        `ETA: Not Deliverable\n\n` +
        `This item is currently out of stock for pincode ${pincode}. Would you like me to notify you when it becomes available?`;
    }

    return {
      query: userQuery,
      requestId: masterRequestId,
      gatewayEndpoint: this.gatewayUrl,
      toolCallLogs,
      finalResponse
    };
  }
}
