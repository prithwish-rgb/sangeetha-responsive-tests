import { config } from '../config/env';
import {
  SangeethaApiResponse,
  SangeethaPincodeEtaData,
  SangeethaSearchProductsData,
  SangeethaProductDetailItem,
  SangeethaProductEtaDetailData
} from '../types/sangeetha.types';

export class SangeethaApiService {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl = config.sangeethaBaseUrl, timeoutMs = config.requestTimeoutMs) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  private async post<T>(endpoint: string, body: Record<string, any>): Promise<SangeethaApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const start = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json, text/plain, */*',
          'user-agent': 'Sangeetha-Hyperlocal-AgentCore-POC/1.0 (AWS-Bedrock-MCP)'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const elapsed = Date.now() - start;
      const text = await response.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch (err) {
        throw new Error(`Sangeetha API returned non-JSON response from ${endpoint} (HTTP ${response.status}): ${text.slice(0, 200)}`);
      }

      if (!response.ok && json.http_code === undefined) {
        json.http_code = response.status;
      }

      return json as SangeethaApiResponse<T>;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Sangeetha API request to ${endpoint} timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * 1. Check Pincode ETA & City-level Serviceability
   * Endpoint: POST /b/pims/data-model/pincode-eta-check
   */
  async checkPincodeEta(pincode: string): Promise<SangeethaApiResponse<SangeethaPincodeEtaData>> {
    return this.post<SangeethaPincodeEtaData>('/b/pims/data-model/pincode-eta-check', {
      pinCode: pincode.trim()
    });
  }

  /**
   * 2. Search Products
   * Endpoint: POST /b/customer/api/search/products
   */
  async searchProducts(
    keyword: string,
    pincode = '560078',
    offset = '0',
    limit = '30'
  ): Promise<SangeethaApiResponse<SangeethaSearchProductsData>> {
    return this.post<SangeethaSearchProductsData>('/b/customer/api/search/products', {
      keyword: keyword.trim(),
      pinCode: pincode.trim(),
      type: 'desktop',
      offset: String(offset),
      limit: String(limit)
    });
  }

  /**
   * 3. Get Full Product Details
   * Endpoint: POST /b/customer/api/v3/product-details
   */
  async getProductDetails(
    productId: string | number,
    pincode = '560078'
  ): Promise<SangeethaApiResponse<SangeethaProductDetailItem[]>> {
    return this.post<SangeethaProductDetailItem[]>('/b/customer/api/v3/product-details', {
      type: 'desktop',
      product_id: String(productId),
      pinCode: pincode.trim(),
      user_id: ''
    });
  }

  /**
   * 4. Get Product ETA & Store Fulfillment Allocation Details
   * Endpoint: POST /b/customer/api/v3/product-eta-details
   */
  async getProductEtaDetails(
    productId: string | number,
    pincode = '560078'
  ): Promise<SangeethaApiResponse<SangeethaProductEtaDetailData>> {
    return this.post<SangeethaProductEtaDetailData>('/b/customer/api/v3/product-eta-details', {
      type: 'desktop',
      product_id: String(productId),
      pinCode: pincode.trim(),
      user_id: ''
    });
  }
}

export const sangeethaApiService = new SangeethaApiService();
