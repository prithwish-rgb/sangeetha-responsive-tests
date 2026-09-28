import { sangeethaApiService } from '../services/sangeetha-api.service';
import { UcpFulfillmentMapper } from '../mappers/ucp-fulfillment.mapper';
import { SangeethaPincodeEtaData } from '../types/sangeetha.types';

export class McpToolHandlers {
  /**
   * Logs structured telemetry for each tool execution
   */
  private static logExecution(
    toolName: string,
    input: any,
    apiEndpoint: string,
    rawResult: any,
    ucpResult: any
  ) {
    const timestamp = new Date().toISOString();
    console.log(`\n======================================================`);
    console.log(`[MCP Tool Invocation] [${timestamp}]`);
    console.log(`  ▶ Tool Name:       ${toolName}`);
    console.log(`  ▶ Input Args:      ${JSON.stringify(input)}`);
    console.log(`  ▶ Sangeetha API:   POST ${apiEndpoint}`);
    console.log(`  ▶ Raw API Status:  ${rawResult?.http_code ?? 200} - ${rawResult?.message ?? 'OK'}`);
    console.log(`  ▶ UCP Result:      ${JSON.stringify(ucpResult, null, 2)}`);
    console.log(`======================================================\n`);
  }

  /**
   * Tool 1: search_products(query, max_price?, brand?, pincode?)
   */
  public static async handleSearchProducts(args: {
    query: string;
    max_price?: number;
    brand?: string;
    pincode?: string;
  }) {
    const pincode = args.pincode || '560078';
    const [searchRes, pincodeRes] = await Promise.all([
      sangeethaApiService.searchProducts(args.query, pincode),
      sangeethaApiService.checkPincodeEta(pincode).catch(() => ({
        http_code: 200,
        message: '',
        data: {} as SangeethaPincodeEtaData
      }))
    ]);

    const rawProducts = searchRes.data?.product_list || [];
    let filtered = rawProducts;

    if (args.max_price !== undefined && args.max_price !== null) {
      filtered = filtered.filter(p => {
        const price = p.sale_price_int || parseFloat(p.sale_price || p.mop || '999999');
        return price <= args.max_price!;
      });
    }

    if (args.brand) {
      const b = args.brand.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const brandName = (p.brand_name || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        const itemFullName = (p.item_fullname || '').toLowerCase();

        if (b === 'apple' || b === 'iphone') {
          return brandName.includes('apple') || title.includes('iphone') || title.includes('apple');
        }
        if (b === 'google' || b === 'pixel') {
          return brandName.includes('google') || brandName.includes('pixel') || title.includes('pixel') || title.includes('google');
        }
        if (b === 'nothing') {
          return brandName.includes('nothing') || title.includes('nothing') || itemFullName.includes('nothing');
        }
        if (b === 'samsung') {
          return brandName.includes('samsung') || title.includes('samsung') || itemFullName.includes('samsung');
        }
        if (b === 'oneplus' || b === 'one plus') {
          return brandName.includes('oneplus') || brandName.includes('one plus') || title.includes('oneplus') || title.includes('one plus');
        }
        if (b === 'xiaomi' || b === 'redmi') {
          return brandName.includes('xiaomi') || brandName.includes('redmi') || title.includes('xiaomi') || title.includes('redmi');
        }
        return brandName.includes(b) || title.includes(b) || itemFullName.includes(b);
      });
    }

    const ucpProducts = filtered.map(item =>
      UcpFulfillmentMapper.mapProductToSummary(item, pincode, pincodeRes.data)
    );

    const result = {
      query: args.query,
      applied_filters: {
        max_price: args.max_price ?? null,
        brand: args.brand ?? null,
        pincode
      },
      total_matches: filtered.length,
      unfiltered_matches_count: rawProducts.length,
      products: ucpProducts
    };

    this.logExecution('search_products', args, '/b/customer/api/search/products', searchRes, result);
    return result;
  }

  /**
   * Tool 2: get_product(product_id, pincode?)
   */
  public static async handleGetProduct(args: { product_id: string; pincode?: string }) {
    const pincode = args.pincode || '560078';
    const [detailRes, pincodeRes] = await Promise.all([
      sangeethaApiService.getProductDetails(args.product_id, pincode),
      sangeethaApiService.checkPincodeEta(pincode).catch(() => ({ http_code: 200, message: '', data: {} as SangeethaPincodeEtaData }))
    ]);

    const item = detailRes.data?.[0];
    if (!item) {
      const errorResult = { error: `Product ID ${args.product_id} not found on Sangeetha catalog` };
      this.logExecution('get_product', args, '/b/customer/api/v3/product-details', detailRes, errorResult);
      return errorResult;
    }

    const ucpProduct = UcpFulfillmentMapper.mapProductToSummary(item, pincode, pincodeRes.data);
    const result = {
      product: ucpProduct,
      specifications: item.product_specification || [],
      variants: item.variant_details || []
    };

    this.logExecution('get_product', args, '/b/customer/api/v3/product-details', detailRes, result);
    return result;
  }

  /**
   * Tool 3: check_stock(product_id, pincode)
   */
  public static async handleCheckStock(args: { product_id: string; pincode: string }) {
    const [etaRes, pincodeRes] = await Promise.all([
      sangeethaApiService.getProductEtaDetails(args.product_id, args.pincode),
      sangeethaApiService.checkPincodeEta(args.pincode).catch(() => ({ http_code: 200, message: '', data: {} as SangeethaPincodeEtaData }))
    ]);

    const eta = etaRes.data?.product_eta;
    const ucpFulfillment = UcpFulfillmentMapper.mapToUcpFulfillment(
      args.pincode,
      eta,
      pincodeRes.data,
      etaRes.data?.in_stock
    );

    const result = {
      product_id: args.product_id,
      pincode: args.pincode,
      availability: ucpFulfillment.availability,
      fulfilling_location: ucpFulfillment.location,
      delivery_description: ucpFulfillment.buyer_facing_description
    };

    this.logExecution('check_stock', args, '/b/customer/api/v3/product-eta-details', etaRes, result);
    return result;
  }

  /**
   * Tool 4: check_pincode_serviceability(pincode, product_id?)
   */
  public static async handleCheckPincodeServiceability(args: { pincode: string; product_id?: string }) {
    const pincodeRes = await sangeethaApiService.checkPincodeEta(args.pincode);
    const pData = pincodeRes.data;

    const isServiceable = Boolean(
      pincodeRes.http_code === 200 &&
      pData &&
      pData.delivery_location !== null &&
      pData.message !== 'Please enter valid pincode' &&
      !pData.message?.includes('valid pincode')
    );

    let itemServiceability: any = undefined;
    if (args.product_id && isServiceable) {
      const etaRes = await sangeethaApiService.getProductEtaDetails(args.product_id, args.pincode).catch(() => null);
      if (etaRes?.data?.product_eta) {
        itemServiceability = {
          stock_status: etaRes.data.product_eta.stock_status,
          eta: etaRes.data.product_eta.eta || etaRes.data.product_eta.eta_title,
          store_name: etaRes.data.product_eta.store_name
        };
      }
    }

    const result = {
      pincode: args.pincode,
      serviceable: isServiceable,
      city: pData?.delivery_location || null,
      sla_header: pData?.header_eta || (isServiceable ? 'Standard Delivery' : 'Unserviceable'),
      message: pData?.message || (isServiceable ? 'Pincode serviceable' : 'Pincode not serviceable'),
      item_level_serviceability: itemServiceability
    };

    this.logExecution('check_pincode_serviceability', args, '/b/pims/data-model/pincode-eta-check', pincodeRes, result);
    return result;
  }

  /**
   * Tool 5: get_delivery_eta(product_id, pincode)
   */
  public static async handleGetDeliveryEta(args: { product_id: string; pincode: string }) {
    const [etaRes, pincodeRes] = await Promise.all([
      sangeethaApiService.getProductEtaDetails(args.product_id, args.pincode),
      sangeethaApiService.checkPincodeEta(args.pincode).catch(() => ({ http_code: 200, message: '', data: {} as SangeethaPincodeEtaData }))
    ]);

    const eta = etaRes.data?.product_eta;
    const ucpFulfillment = UcpFulfillmentMapper.mapToUcpFulfillment(
      args.pincode,
      eta,
      pincodeRes.data,
      etaRes.data?.in_stock
    );

    const result = {
      product_id: args.product_id,
      pincode: args.pincode,
      fulfillment_options: ucpFulfillment.fulfillment_options,
      earliest_fulfillment_time: ucpFulfillment.earliest_fulfillment_time,
      latest_fulfillment_time: ucpFulfillment.latest_fulfillment_time,
      buyer_facing_description: ucpFulfillment.buyer_facing_description,
      fulfilling_location: ucpFulfillment.location
    };

    this.logExecution('get_delivery_eta', args, '/b/customer/api/v3/product-eta-details', etaRes, result);
    return result;
  }

  /**
   * Tool 6: get_nearest_fulfilling_location(product_id, pincode)
   */
  public static async handleGetNearestFulfillingLocation(args: { product_id: string; pincode: string }) {
    const [etaRes, pincodeRes] = await Promise.all([
      sangeethaApiService.getProductEtaDetails(args.product_id, args.pincode),
      sangeethaApiService.checkPincodeEta(args.pincode).catch(() => ({ http_code: 200, message: '', data: {} as SangeethaPincodeEtaData }))
    ]);

    const eta = etaRes.data?.product_eta;
    const location = UcpFulfillmentMapper.mapLocation(eta, pincodeRes.data?.delivery_location || undefined);

    const result = {
      product_id: args.product_id,
      pincode: args.pincode,
      fulfilling_location: location || {
        name: 'No allocated store',
        code: 'UNALLOCATED',
        type: 'UNKNOWN' as const,
        city: pincodeRes.data?.delivery_location || undefined,
        distance_km: null
      },
      stock_allocated: Boolean(eta?.stock_status?.toLowerCase().includes('instock') || etaRes.data?.in_stock === 1),
      estimated_delivery: eta?.eta_title || eta?.eta || pincodeRes.data?.header_eta || 'Standard SLA'
    };

    this.logExecution('get_nearest_fulfilling_location', args, '/b/customer/api/v3/product-eta-details', etaRes, result);
    return result;
  }

  /**
   * Universal dispatcher for all MCP tools
   */
  public static async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'search_products':
        return this.handleSearchProducts(args);
      case 'get_product':
        return this.handleGetProduct(args);
      case 'check_stock':
        return this.handleCheckStock(args);
      case 'check_pincode_serviceability':
        return this.handleCheckPincodeServiceability(args);
      case 'get_delivery_eta':
        return this.handleGetDeliveryEta(args);
      case 'get_nearest_fulfilling_location':
        return this.handleGetNearestFulfillingLocation(args);
      default:
        throw new Error(`Unknown MCP Tool: ${name}`);
    }
  }
}
