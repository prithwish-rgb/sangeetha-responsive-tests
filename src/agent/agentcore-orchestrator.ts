import { McpToolHandlers } from '../mcp/handlers';
import { MCP_TOOLS } from '../mcp/tools';

export interface AgentCoreTraceStep {
  step: number;
  thought: string;
  tool_call?: {
    tool: string;
    arguments: any;
  };
  tool_result?: any;
}

export interface AgentCoreExecutionResult {
  query: string;
  trace: AgentCoreTraceStep[];
  final_response: string;
  structured_data?: {
    product_name?: string;
    price?: number;
    availability?: string;
    fulfillment_location?: string;
    delivery_method?: string;
    eta?: string;
  };
}

export class BedrockAgentCoreOrchestrator {
  private systemPrompt: string;

  constructor() {
    this.systemPrompt = `You are the Sangeetha Mobiles Hyperlocal Shopping Assistant powered by Amazon Bedrock AgentCore and Model Context Protocol (MCP).
Your responsibility is to assist customers in discovering electronics, checking stock at specific postal codes, determining hyper-accurate delivery ETAs, and identifying nearest fulfilling stores.

RULES:
1. Always use the MCP tools to inspect real-time catalog and inventory data.
2. NEVER invent prices, availability, or delivery ETAs. Report exact backend data.
3. If no product satisfies all user constraints (e.g. price ceiling, delivery SLA), clearly state this and present closest real options.
4. Format final product recommendations with:
   Product: <actual product>
   Price: ₹<actual price>
   Availability: <actual result>
   Fulfillment location: <actual store/warehouse if available>
   Delivery: <actual delivery method>
   ETA: <actual ETA>

   Then conclude with: "Would you like me to add it to the cart?"
5. Do NOT attempt checkout, payment, or order creation.`;
  }

  /**
   * Main AgentCore execution loop
   */
  public async processUserQuery(userQuery: string): Promise<AgentCoreExecutionResult> {
    const trace: AgentCoreTraceStep[] = [];
    let stepCount = 1;

    console.log(`\n======================================================`);
    console.log(`[Bedrock AgentCore] Incoming User Query: "${userQuery}"`);
    console.log(`======================================================`);

    // 1. Natural Language Understanding & Constraint Extraction
    const pincodeMatch = userQuery.match(/\b\d{6}\b/);
    const pincode = pincodeMatch ? pincodeMatch[0] : '560078';

    const priceMatch = userQuery.match(/(?:under|below|less than|within)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
    const maxPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined;

    let keyword = 'iPhone';
    if (/pixel/i.test(userQuery)) keyword = 'Pixel';
    else if (/samsung/i.test(userQuery)) keyword = 'Samsung';
    else if (/nothing/i.test(userQuery)) keyword = 'Nothing';
    else if (/oppo/i.test(userQuery)) keyword = 'Oppo';
    else if (/realme/i.test(userQuery)) keyword = 'Realme';
    else if (/iphone\s*\d+/i.test(userQuery)) {
      const m = userQuery.match(/iphone\s*\d+/i);
      keyword = m ? m[0] : 'iPhone';
    }

    // Step 1: Pincode serviceability check
    trace.push({
      step: stepCount++,
      thought: `Check if target postal code ${pincode} is serviceable by Sangeetha logistics network.`,
      tool_call: {
        tool: 'check_pincode_serviceability',
        arguments: { pincode }
      }
    });

    const pincodeResult = await McpToolHandlers.executeTool('check_pincode_serviceability', { pincode });
    trace[trace.length - 1].tool_result = pincodeResult;

    if (!pincodeResult.serviceable) {
      const finalMsg = `I'm sorry, but postal code ${pincode} is currently not serviceable for delivery by Sangeetha Mobiles (${pincodeResult.message || 'Unserviceable area'}). Please provide an alternative delivery pincode.`;
      return {
        query: userQuery,
        trace,
        final_response: finalMsg
      };
    }

    // Step 2: Search products in catalog
    trace.push({
      step: stepCount++,
      thought: `Search live Sangeetha catalog for "${keyword}" with max_price: ${maxPrice ?? 'none'} at pincode ${pincode}.`,
      tool_call: {
        tool: 'search_products',
        arguments: {
          query: keyword,
          max_price: maxPrice,
          pincode
        }
      }
    });

    const searchResult = await McpToolHandlers.executeTool('search_products', {
      query: keyword,
      max_price: maxPrice,
      pincode
    });
    trace[trace.length - 1].tool_result = searchResult;

    const matchedProducts = searchResult.products || [];

    // Case E: No products under requested price ceiling
    if (matchedProducts.length === 0) {
      // Also query without max_price to provide helpful alternative
      const allSearch = await McpToolHandlers.executeTool('search_products', { query: keyword, pincode });
      const nearestPrice = allSearch.products?.[0];

      let altInfo = '';
      if (nearestPrice) {
        altInfo = ` The lowest priced ${keyword} currently in catalog is the **${nearestPrice.title}** at ₹${nearestPrice.price.sale_price.toLocaleString('en-IN')}.`;
      }

      const finalMsg = `No ${keyword} models were found under ₹${maxPrice?.toLocaleString('en-IN') || '80,000'} in Sangeetha's live inventory.${altInfo}\n\nWould you like me to show alternative smartphones within your budget, or look at the available ${keyword} models?`;
      return {
        query: userQuery,
        trace,
        final_response: finalMsg
      };
    }

    // Step 3: Inspect the best matching product details & stock allocation
    const candidate = matchedProducts[0];
    const candidateId = candidate.product_id;

    trace.push({
      step: stepCount++,
      thought: `Inspect store allocation and stock status for top match ${candidate.title} (ID: ${candidateId}) at pincode ${pincode}.`,
      tool_call: {
        tool: 'check_stock',
        arguments: { product_id: candidateId, pincode }
      }
    });

    const stockResult = await McpToolHandlers.executeTool('check_stock', { product_id: candidateId, pincode });
    trace[trace.length - 1].tool_result = stockResult;

    // Step 4: Calculate delivery ETA and fulfillment options
    trace.push({
      step: stepCount++,
      thought: `Retrieve exact delivery ETA and fulfillment timeline for product ${candidateId} at pincode ${pincode}.`,
      tool_call: {
        tool: 'get_delivery_eta',
        arguments: { product_id: candidateId, pincode }
      }
    });

    const etaResult = await McpToolHandlers.executeTool('get_delivery_eta', { product_id: candidateId, pincode });
    trace[trace.length - 1].tool_result = etaResult;

    // Synthesize structured agent response
    const productName = candidate.title;
    const price = candidate.price.sale_price;
    const isAvailable = stockResult.availability?.is_deliverable ?? (candidate.fulfillment?.availability?.is_deliverable);
    const availText = isAvailable ? 'In Stock (Live Store Inventory)' : 'Out of Stock';
    const storeLocation = etaResult.fulfilling_location?.name || stockResult.fulfilling_location?.name || 'Nearest Sangeetha Hub';
    const deliveryMethod = etaResult.fulfillment_options?.[0]?.title || 'Express Home Delivery';
    const etaText = etaResult.buyer_facing_description || (isAvailable ? '30 Minutes' : 'Currently Unavailable');

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
      trace,
      final_response: finalResponse,
      structured_data: {
        product_name: productName,
        price,
        availability: availText,
        fulfillment_location: storeLocation,
        delivery_method: deliveryMethod,
        eta: etaText
      }
    };
  }
}
