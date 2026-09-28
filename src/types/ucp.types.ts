/**
 * Universal Commerce Protocol (UCP) Fulfillment Schema
 * Standardized concepts for hyperlocal commerce fulfillment
 */

export interface UcpLocation {
  id?: string;
  name: string;
  code: string;
  type: 'STORE' | 'WAREHOUSE' | 'DARK_STORE' | 'HUB' | 'UNKNOWN';
  city?: string;
  postal_code?: string;
  distance_km?: number | null;
}

export type UcpAvailabilityStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED_STOCK' | 'PREORDER' | 'UNSERVICEABLE';

export interface UcpAvailability {
  status: UcpAvailabilityStatus;
  available_quantity?: number;
  is_deliverable: boolean;
  is_pickup_available: boolean;
  message?: string;
}

export interface UcpFulfillmentOption {
  type: 'SHIPPING' | 'PICKUP' | 'EXPRESS_DELIVERY' | 'STANDARD_DELIVERY';
  title: string;
  description: string;
  duration_minutes?: number | null;
  earliest_fulfillment_time?: string | null;
  latest_fulfillment_time?: string | null;
  buyer_facing_description: string;
  fulfillment_location?: UcpLocation;
}

export interface UcpFulfillment {
  postal_code: string;
  location?: UcpLocation;
  availability: UcpAvailability;
  shipping: {
    serviceable: boolean;
    header_eta?: string;
    delivery_location?: string;
  };
  pickup: {
    available: boolean;
    store_name?: string;
  };
  fulfillment_options: UcpFulfillmentOption[];
  earliest_fulfillment_time?: string | null;
  latest_fulfillment_time?: string | null;
  buyer_facing_description: string;
  
  // Sangeetha internal backend context (isolated from core UCP properties)
  _sangeetha_internal?: {
    raw_eta_title?: string;
    store_code?: string;
    store_type_id?: string;
    stock_status_raw?: string | number;
    delivery_icon?: string;
    is_drop_shipment?: boolean;
    level?: string;
  };
}

export interface UcpProductSummary {
  product_id: string;
  item_code: string;
  title: string;
  brand: string;
  color?: string;
  price: {
    currency: string;
    mrp: number;
    sale_price: number;
    mop?: number;
    savings?: number;
  };
  image_url?: string;
  fulfillment: UcpFulfillment;
}
