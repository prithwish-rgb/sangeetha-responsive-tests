export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'search_products',
    description: 'Search the live Sangeetha Mobiles product catalog by keyword, with optional price ceiling and brand filters. Returns product summaries, prices, stock status, and fulfillment metadata mapped to UCP format.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Product search term or keyword (e.g. "iPhone", "iPhone 17", "Pixel 10", "Samsung S24")'
        },
        max_price: {
          type: 'number',
          description: 'Optional maximum price ceiling in INR (₹) to filter results'
        },
        brand: {
          type: 'string',
          description: 'Optional brand filter (e.g. "Apple", "Samsung", "Google")'
        },
        pincode: {
          type: 'string',
          description: 'Optional 6-digit Indian postal code to evaluate local store availability and ETA for search results (defaults to 560078)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_product',
    description: 'Retrieve detailed technical specifications, pricing, color/storage variants, warranty info, and images for a specific Sangeetha product by product ID.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'Unique Sangeetha product ID (e.g. "21906")'
        },
        pincode: {
          type: 'string',
          description: 'Optional 6-digit Indian postal code to evaluate location-specific pricing and stock'
        }
      },
      required: ['product_id']
    }
  },
  {
    name: 'check_stock',
    description: 'Check real-time stock availability and inventory status of a specific product at a given 6-digit postal code. Returns UCP availability status (IN_STOCK, LIMITED_STOCK, OUT_OF_STOCK) and fulfilling store allocation.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'Unique Sangeetha product ID'
        },
        pincode: {
          type: 'string',
          description: '6-digit Indian postal code (e.g. "560078")'
        }
      },
      required: ['product_id', 'pincode']
    }
  },
  {
    name: 'check_pincode_serviceability',
    description: 'Validate whether a 6-digit Indian postal code is serviceable by Sangeetha Mobiles logistics and hyperlocal delivery network. Returns city/location name, header delivery SLA (e.g. "30 Minutes"), and serviceability status.',
    inputSchema: {
      type: 'object',
      properties: {
        pincode: {
          type: 'string',
          description: '6-digit Indian postal code to check (e.g. "560078")'
        },
        product_id: {
          type: 'string',
          description: 'Optional product ID to check item-level serviceability alongside postal code validation'
        }
      },
      required: ['pincode']
    }
  },
  {
    name: 'get_delivery_eta',
    description: 'Calculate delivery ETA, delivery time window (earliest/latest), and buyer-facing delivery description for a specific product and postal code according to UCP fulfillment standards.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'Unique Sangeetha product ID'
        },
        pincode: {
          type: 'string',
          description: '6-digit Indian postal code (e.g. "560078")'
        }
      },
      required: ['product_id', 'pincode']
    }
  },
  {
    name: 'get_nearest_fulfilling_location',
    description: 'Identify the nearest fulfilling physical Sangeetha store or central warehouse allocated for delivering the product to the specified postal code.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'Unique Sangeetha product ID'
        },
        pincode: {
          type: 'string',
          description: '6-digit Indian postal code (e.g. "560078")'
        }
      },
      required: ['product_id', 'pincode']
    }
  }
];
