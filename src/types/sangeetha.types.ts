/**
 * Sangeetha Backend API Types (Verified from live production endpoints)
 */

export interface SangeethaApiResponse<T> {
  http_code: number;
  message: string;
  data: T;
}

export interface SangeethaPincodeEtaData {
  header_eta?: string;
  delivery_location?: string | null;
  delivery_icon?: string | null;
  message?: string;
}

export interface SangeethaProductEta {
  pincode: string;
  item_code?: string;
  quantity?: string;
  stock_status?: string; // 'Instock', 'Out of stock'
  eta?: string; // e.g. '30 minutes'
  level?: string;
  is_drop_shipment?: boolean;
  store_code?: string; // e.g. 'KNS'
  store_name?: string; // e.g. 'Kengeri-4 (satellite town) (SMPL)'
  store_type?: string; // '1'
  store_type_name?: string; // 'STORE', 'WAREHOUSE'
  store_wt?: number;
  eta_org?: string;
  eta_date?: string; // '2026-09-23'
  eta_title?: string; // 'Get Delivery in 30 minutes'
  eta_title_2?: string; // 'Delivery by 30 minutes'
  delivery_icon?: string;
  eta_min?: number; // 30
  distance?: string;
  google_eta?: string;
  out_of_stock_msg?: string;
  show_stock_message?: boolean;
  stock_message?: string;
  stock_message_color_code?: string;
}

export interface SangeethaProductListItem {
  product_id: number;
  item_code: string;
  brand_id: number;
  brand_name: string;
  item_fullname: string;
  title: string;
  mop: string;
  mrp: string;
  sale_price: string;
  sale_price_int?: number;
  color?: string;
  in_stock: number; // 0 or 1
  stock_status: number; // 1
  product_group_id?: number;
  product_group_name?: string;
  product_eta?: SangeethaProductEta[];
  image_details?: Array<{ file_url: string }>;
}

export interface SangeethaSearchProductsData {
  search_keyword: string;
  pagination: {
    total_records: number;
    total_pages: number;
    next_offset: number;
  };
  group_list?: Array<{
    product_group_id: number;
    group_name: string;
    item_fullname: string;
    stock_status: number;
  }>;
  product_list: SangeethaProductListItem[];
}

export interface SangeethaProductDetailItem {
  product_id: number;
  product_group_id: number;
  product_group_name: string;
  item_code: string;
  item_fullname: string;
  title: string;
  product_slug?: string;
  brand_name: string;
  sale_price: string;
  mop: string;
  mrp: string;
  color: string;
  category_name_l2?: string;
  description?: string;
  product_specification?: Array<{
    title: string;
    specification_details: Array<{ attribute_name: string; attribute_value: string }>;
  }>;
  variant_details?: Array<{
    attribute_name: string;
    attribute_values: Array<{
      product_id: number;
      item_fullname: string;
      variant_value: string;
      color?: string;
      sale_price: string;
    }>;
  }>;
  product_eta?: SangeethaProductEta | SangeethaProductEta[];
}

export interface SangeethaProductEtaDetailData {
  product_id: number;
  item_code: string;
  brand_name: string;
  sale_price: string;
  mop: string;
  mrp: string;
  item_fullname: string;
  color: string;
  in_stock: number;
  product_eta: SangeethaProductEta;
  variant_details?: Array<{
    attribute_name: string;
    attribute_values: Array<{
      product_id: number;
      item_fullname: string;
      variant_value: string;
      sale_price: string;
    }>;
  }>;
}
