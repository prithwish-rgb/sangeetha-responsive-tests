import { A2AHandoffRequest, A2AHandoffResponse } from '../types/a2a.types';
import { McpToolHandlers } from '../mcp/handlers';
import { UcpProductSummary } from '../types/ucp.types';

/**
 * Agent 2: External Sangeetha Hyperlocal Commerce Agent
 * Identity: sangeetha.hyperlocal.commerce-agent.v1
 *
 * Responsibilities:
 * - Accepts A2A handoff tasks from external orchestrators (Amazon Agent).
 * - Exclusively uses the Sangeetha Commerce MCP interface for commerce and fulfillment operations.
 * - Queries live Sangeetha systems and maps to UCP format.
 * - Enforces deterministic brand & product validation to prevent brand substitution.
 * - Returns structured fulfillment data across the external-agent boundary.
 */
export class SangeethaHyperlocalCommerceAgent {
  public readonly agentId = 'sangeetha.hyperlocal.commerce-agent.v1';
  public readonly agentName = 'Sangeetha Hyperlocal Commerce Specialist Agent';
  public readonly agentDescription = 'Specialist commerce agent managing inventory, pricing, and hyperlocal store fulfillment for Sangeetha Mobiles';

  /**
   * Internal helper to invoke the dedicated Sangeetha Commerce MCP interface
   */
  private async invokeMcpTool(toolName: string, args: any): Promise<{ result: any; endpoint: string }> {
    console.log(`  [SANGEETHA AGENT] Calling MCP Tool: ${toolName}`);
    console.log(`    Arguments: ${JSON.stringify(args)}`);

    const result = await McpToolHandlers.executeTool(toolName, args);

    let endpoint = '/b/customer/api/search/products';
    if (toolName === 'check_pincode_serviceability') endpoint = '/b/pims/data-model/pincode-eta-check';
    else if (toolName === 'get_product') endpoint = '/b/customer/api/v3/product-details';
    else if (toolName.includes('stock') || toolName.includes('location') || toolName.includes('eta')) {
      endpoint = '/b/customer/api/v3/product-eta-details';
    }

    return { result, endpoint };
  }

  /**
   * Deterministic Brand & Product Validation
   */
  public validateProductMatch(product: UcpProductSummary, requestedBrand?: string, requestedQuery?: string): boolean {
    if (!requestedBrand && !requestedQuery) return true;

    const targetBrand = (requestedBrand || '').toLowerCase().trim();
    const prodBrand = (product.brand || '').toLowerCase().trim();
    const prodTitle = (product.title || '').toLowerCase().trim();

    if (targetBrand) {
      if (targetBrand === 'nothing') {
        return prodBrand.includes('nothing') || prodTitle.includes('nothing');
      }
      if (targetBrand === 'apple' || targetBrand === 'iphone') {
        return prodBrand.includes('apple') || prodTitle.includes('iphone') || prodTitle.includes('apple');
      }
      if (targetBrand === 'samsung') {
        return prodBrand.includes('samsung') || prodTitle.includes('samsung');
      }
      if (targetBrand === 'google' || targetBrand === 'pixel') {
        return prodBrand.includes('google') || prodBrand.includes('pixel') || prodTitle.includes('pixel') || prodTitle.includes('google');
      }
      if (targetBrand === 'oneplus' || targetBrand === 'one plus') {
        return prodBrand.includes('oneplus') || prodBrand.includes('one plus') || prodTitle.includes('oneplus') || prodTitle.includes('one plus');
      }
      if (targetBrand === 'xiaomi' || targetBrand === 'redmi') {
        return prodBrand.includes('xiaomi') || prodBrand.includes('redmi') || prodTitle.includes('xiaomi') || prodTitle.includes('redmi');
      }
      if (targetBrand === 'realme') {
        return prodBrand.includes('realme') || prodTitle.includes('realme');
      }
      if (targetBrand === 'oppo') {
        return prodBrand.includes('oppo') || prodTitle.includes('oppo');
      }
      if (targetBrand === 'vivo' || targetBrand === 'iqoo') {
        return prodBrand.includes('vivo') || prodBrand.includes('iqoo') || prodTitle.includes('vivo') || prodTitle.includes('iqoo');
      }
      if (targetBrand === 'motorola' || targetBrand === 'moto') {
        return prodBrand.includes('motorola') || prodBrand.includes('moto') || prodTitle.includes('motorola') || prodTitle.includes('moto');
      }
      return prodBrand.includes(targetBrand) || prodTitle.includes(targetBrand);
    }

    if (requestedQuery) {
      const q = requestedQuery.toLowerCase().trim();
      return prodTitle.includes(q) || prodBrand.includes(q);
    }

    return true;
  }

  public async executeHandoff(request: A2AHandoffRequest): Promise<A2AHandoffResponse> {
    return this.handleA2AHandoff(request);
  }

  /**
   * Main A2A Task Processor
   */
  public async handleA2AHandoff(request: A2AHandoffRequest): Promise<A2AHandoffResponse> {
    const startTime = Date.now();
    const toolsCalled: string[] = [];
    const endpointsQueried: string[] = [];

    console.log(`\n======================================================`);
    console.log(`[SANGEETHA AGENT] Accepted Handoff [ID: ${request.handoff_id}]`);
    console.log(`  ▶ Source Agent:     ${request.source_agent_id}`);
    console.log(`  ▶ Target Agent:     ${this.agentId}`);
    console.log(`  ▶ Task Intent:      ${request.task.intent}`);
    console.log(`  ▶ Query:            "${request.task.query}"`);
    console.log(`  ▶ Brand:            ${request.task.brand || 'Unspecified'}`);
    console.log(`  ▶ Product ID:       ${request.task.product_id || 'None'}`);
    console.log(`  ▶ Max Price:        ${request.task.max_price ? `₹${request.task.max_price}` : 'None'}`);
    console.log(`  ▶ Pincode:          ${request.task.pincode}`);
    console.log(`  ▶ Delivery SLA:     ${request.task.delivery_requirement || 'standard'}`);
    console.log(`======================================================\n`);

    const { query, brand, product_id, max_price, pincode, delivery_requirement } = request.task;

    // Step 1: Check Pincode Serviceability via MCP
    toolsCalled.push('check_pincode_serviceability');
    const { result: pinRes, endpoint: epPin } = await this.invokeMcpTool('check_pincode_serviceability', { pincode });
    endpointsQueried.push(epPin);

    if (!pinRes.serviceable) {
      console.log(`  [SANGEETHA AGENT] Pincode ${pincode} is not serviceable (${pinRes.message}).`);
      return {
        handoff_id: request.handoff_id,
        source_agent_id: this.agentId,
        target_agent_id: request.source_agent_id,
        timestamp: new Date().toISOString(),
        status: 'UNSERVICEABLE',
        execution_summary: {
          mcp_tools_called: toolsCalled,
          live_sangeetha_endpoints_queried: Array.from(new Set(endpointsQueried)),
          total_execution_ms: Date.now() - startTime
        },
        data: {
          serviceability_message: pinRes.message || 'Pincode not serviceable by Sangeetha logistics network',
          source: 'live_sangeetha_production_api'
        }
      };
    }

    let candidateProduct: UcpProductSummary | undefined;
    let matchedProducts: UcpProductSummary[] = [];

    // Branch A: Direct Product Evaluation (e.g. multi-turn follow-up with specific product_id)
    if (product_id) {
      toolsCalled.push('get_product');
      const { result: prodRes, endpoint: epProd } = await this.invokeMcpTool('get_product', { product_id, pincode });
      endpointsQueried.push(epProd);

      if (prodRes.product) {
        candidateProduct = prodRes.product;
        matchedProducts = [candidateProduct!];
      }
    }

    // Branch B: Product Search via MCP
    if (!candidateProduct) {
      toolsCalled.push('search_products');
      const { result: searchRes, endpoint: epSearch } = await this.invokeMcpTool('search_products', {
        query,
        brand,
        max_price,
        pincode
      });
      endpointsQueried.push(epSearch);

      const rawProducts: UcpProductSummary[] = searchRes.products || [];

      // Deterministic validation after search_products
      const validatedProducts = rawProducts.filter(product => {
        const isMatch = this.validateProductMatch(product, brand, query);
        console.log(`[PRODUCT MATCH] Requested brand: ${brand || query}`);
        console.log(`[PRODUCT MATCH] Candidate: ${product.title} (Brand: ${product.brand})`);
        console.log(`[PRODUCT MATCH] Brand/title match: ${isMatch}`);
        return isMatch;
      });

      matchedProducts = validatedProducts;

      // Case: No valid matching product under requested price / brand
      if (validatedProducts.length === 0) {
        console.log(`  [SANGEETHA AGENT] 0 valid matching products found under constraints. Querying lowest in catalog...`);
        toolsCalled.push('search_products');
        const { result: fallbackSearch } = await this.invokeMcpTool('search_products', { query, brand, pincode });
        const rawFallback: UcpProductSummary[] = fallbackSearch.products || [];

        const validatedFallback = rawFallback.filter(p => {
          const isMatch = this.validateProductMatch(p, brand, query);
          console.log(`[PRODUCT MATCH] Requested brand: ${brand || query}`);
          console.log(`[PRODUCT MATCH] Candidate: ${p.title} (Brand: ${p.brand})`);
          console.log(`[PRODUCT MATCH] Brand/title match: ${isMatch}`);
          return isMatch;
        });

        const lowestProduct = validatedFallback[0] || undefined;

        return {
          handoff_id: request.handoff_id,
          source_agent_id: this.agentId,
          target_agent_id: request.source_agent_id,
          timestamp: new Date().toISOString(),
          status: 'NO_MATCH',
          execution_summary: {
            mcp_tools_called: toolsCalled,
            live_sangeetha_endpoints_queried: Array.from(new Set(endpointsQueried)),
            total_execution_ms: Date.now() - startTime
          },
          data: {
            all_matches: [],
            lowest_catalog_price_product: lowestProduct,
            source: 'live_sangeetha_production_api'
          }
        };
      }

      candidateProduct = validatedProducts[0];
    }

    const productId = candidateProduct.product_id;

    // Step 3: Check Real-time Stock via MCP
    toolsCalled.push('check_stock');
    const { result: stockRes, endpoint: epStock } = await this.invokeMcpTool('check_stock', {
      product_id: productId,
      pincode
    });
    endpointsQueried.push(epStock);

    // Step 4: Get Nearest Fulfilling Location via MCP
    toolsCalled.push('get_nearest_fulfilling_location');
    const { result: locRes, endpoint: epLoc } = await this.invokeMcpTool('get_nearest_fulfilling_location', {
      product_id: productId,
      pincode
    });
    endpointsQueried.push(epLoc);

    // Step 5: Get Delivery ETA via MCP
    toolsCalled.push('get_delivery_eta');
    const { result: etaRes, endpoint: epEta } = await this.invokeMcpTool('get_delivery_eta', {
      product_id: productId,
      pincode
    });
    endpointsQueried.push(epEta);

    const isAvailable = stockRes.availability?.is_deliverable ?? false;
    const durationMinutes = etaRes.fulfillment_options?.[0]?.duration_minutes || 1440;
    const isDeliverableToday = isAvailable && durationMinutes <= 720; // within 12 hours = today

    let status: A2AHandoffResponse['status'] = 'SUCCESS';
    if (!isAvailable) status = 'OUT_OF_STOCK';

    console.log(`  [SANGEETHA AGENT] Formulating A2A Handoff Response (Status: ${status}).`);

    return {
      handoff_id: request.handoff_id,
      source_agent_id: this.agentId,
      target_agent_id: request.source_agent_id,
      timestamp: new Date().toISOString(),
      status,
      execution_summary: {
        mcp_tools_called: toolsCalled,
        live_sangeetha_endpoints_queried: Array.from(new Set(endpointsQueried)),
        total_execution_ms: Date.now() - startTime
      },
      data: {
        matched_product: candidateProduct,
        all_matches: matchedProducts,
        fulfillment: {
          postal_code: pincode,
          location: locRes.fulfilling_location,
          availability: stockRes.availability,
          shipping: {
            serviceable: true,
            header_eta: etaRes.buyer_facing_description,
            delivery_location: locRes.fulfilling_location?.city
          },
          pickup: {
            available: isAvailable && locRes.fulfilling_location?.type === 'STORE',
            store_name: locRes.fulfilling_location?.name
          },
          fulfillment_options: etaRes.fulfillment_options || [],
          earliest_fulfillment_time: etaRes.earliest_fulfillment_time,
          latest_fulfillment_time: etaRes.latest_fulfillment_time,
          buyer_facing_description: etaRes.buyer_facing_description || 'Standard Delivery'
        },
        is_deliverable_today: isDeliverableToday,
        source: 'live_sangeetha_production_api'
      }
    };
  }
}

export const sangeethaSpecialistAgent = new SangeethaHyperlocalCommerceAgent();
