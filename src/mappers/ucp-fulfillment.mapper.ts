import {
  SangeethaProductListItem,
  SangeethaProductDetailItem,
  SangeethaProductEtaDetailData,
  SangeethaProductEta,
  SangeethaPincodeEtaData
} from '../types/sangeetha.types';
import {
  UcpFulfillment,
  UcpLocation,
  UcpAvailability,
  UcpFulfillmentOption,
  UcpProductSummary,
  UcpAvailabilityStatus
} from '../types/ucp.types';

export class UcpFulfillmentMapper {
  /**
   * Helper to parse ETA minutes from Sangeetha eta strings like '30 minutes', '2 Hours', etc.
   */
  public static parseEtaMinutes(etaStr?: string | number | null): number | null {
    if (etaStr === undefined || etaStr === null) return null;
    if (typeof etaStr === 'number') return etaStr;
    const s = String(etaStr).toLowerCase().trim();
    if (!s) return null;

    const minMatch = s.match(/(\d+)\s*(?:min|mins|minute|minutes)/);
    if (minMatch) return parseInt(minMatch[1], 10);

    const hrMatch = s.match(/(\d+)\s*(?:hr|hrs|hour|hours)/);
    if (hrMatch) return parseInt(hrMatch[1], 10) * 60;

    const dayMatch = s.match(/(\d+)\s*(?:day|days)/);
    if (dayMatch) return parseInt(dayMatch[1], 10) * 24 * 60;

    return null;
  }

  /**
   * Maps Sangeetha store data to standard UcpLocation
   */
  public static mapLocation(eta?: SangeethaProductEta, city?: string): UcpLocation | undefined {
    if (!eta || !eta.store_name) {
      if (city) {
        return {
          name: `${city} Central Distribution`,
          code: 'CITY-HUB',
          type: 'HUB',
          city,
          distance_km: null
        };
      }
      return undefined;
    }

    const typeStr = (eta.store_type_name || '').toUpperCase();
    let locType: UcpLocation['type'] = 'STORE';
    if (typeStr.includes('WAREHOUSE')) locType = 'WAREHOUSE';
    else if (typeStr.includes('HUB')) locType = 'HUB';
    else if (typeStr.includes('STORE')) locType = 'STORE';

    return {
      name: eta.store_name,
      code: eta.store_code || 'SMPL-STORE',
      type: locType,
      city: city || undefined,
      distance_km: eta.distance ? parseFloat(eta.distance) : null
    };
  }

  /**
   * Maps Sangeetha stock status to UcpAvailability
   */
  public static mapAvailability(
    eta?: SangeethaProductEta,
    inStockFlag?: number,
    isPincodeValid = true
  ): UcpAvailability {
    if (!isPincodeValid) {
      return {
        status: 'UNSERVICEABLE',
        available_quantity: 0,
        is_deliverable: false,
        is_pickup_available: false,
        message: 'Delivery not available for this pincode'
      };
    }

    const stockStatusText = (eta?.stock_status || '').toLowerCase();
    const qty = eta?.quantity ? parseInt(eta.quantity, 10) : (inStockFlag === 1 ? 1 : 0);

    let status: UcpAvailabilityStatus = 'OUT_OF_STOCK';
    let isDeliverable = false;

    if (stockStatusText.includes('instock') || stockStatusText === '1' || (inStockFlag === 1 && !stockStatusText.includes('out'))) {
      status = qty === 1 ? 'LIMITED_STOCK' : 'IN_STOCK';
      isDeliverable = true;
    } else if (stockStatusText.includes('out') || inStockFlag === 0) {
      status = 'OUT_OF_STOCK';
      isDeliverable = false;
    }

    return {
      status,
      available_quantity: qty,
      is_deliverable: isDeliverable,
      is_pickup_available: Boolean(eta?.store_name && isDeliverable),
      message: eta?.stock_message || (isDeliverable ? 'Available for immediate fulfillment' : 'Currently out of stock at this location')
    };
  }

  /**
   * Computes ISO timestamp windows for earliest and latest fulfillment
   */
  public static computeFulfillmentTimes(
    minutes: number | null,
    etaDateStr?: string
  ): { earliest: string | null; latest: string | null } {
    const now = new Date();
    if (minutes !== null && minutes > 0) {
      const earliest = new Date(now.getTime() + (minutes * 0.8 * 60 * 1000)).toISOString();
      const latest = new Date(now.getTime() + (minutes * 60 * 1000)).toISOString();
      return { earliest, latest };
    }

    if (etaDateStr) {
      const date = new Date(etaDateStr);
      if (!isNaN(date.getTime())) {
        return {
          earliest: new Date(date.setHours(9, 0, 0, 0)).toISOString(),
          latest: new Date(date.setHours(21, 0, 0, 0)).toISOString()
        };
      }
    }

    return { earliest: null, latest: null };
  }

  /**
   * Main mapper: Sangeetha ETA + Pincode → UcpFulfillment
   */
  public static mapToUcpFulfillment(
    pincode: string,
    eta?: SangeethaProductEta,
    pincodeData?: SangeethaPincodeEtaData,
    inStockFlag?: number
  ): UcpFulfillment {
    const city = pincodeData?.delivery_location || undefined;
    const isPincodeValid = Boolean(
      pincodeData &&
      pincodeData.delivery_location !== null &&
      pincodeData.message !== 'Please enter valid pincode'
    );

    const location = this.mapLocation(eta, city);
    const availability = this.mapAvailability(eta, inStockFlag, isPincodeValid);

    const durationMins = this.parseEtaMinutes(eta?.eta_min ?? eta?.eta ?? pincodeData?.header_eta);
    const { earliest, latest } = this.computeFulfillmentTimes(durationMins, eta?.eta_date);

    // Build buyer-facing description
    let buyerDesc = 'Delivery not available';
    if (isPincodeValid && availability.is_deliverable) {
      if (eta?.eta_title) {
        buyerDesc = `${eta.eta_title}${location?.name ? ` from ${location.name}` : ''}`;
      } else if (pincodeData?.header_eta) {
        buyerDesc = `Delivery in ${pincodeData.header_eta}${city ? ` to ${city}` : ''}`;
      } else {
        buyerDesc = 'Standard Delivery Available';
      }
    } else if (isPincodeValid && !availability.is_deliverable) {
      buyerDesc = `Currently Out of Stock at pincode ${pincode}`;
    } else {
      buyerDesc = `Pincode ${pincode} is unserviceable`;
    }

    // Build fulfillment options
    const fulfillmentOptions: UcpFulfillmentOption[] = [];
    if (availability.is_deliverable) {
      if (durationMins !== null && durationMins <= 120) {
        fulfillmentOptions.push({
          type: 'EXPRESS_DELIVERY',
          title: 'Hyperlocal Express Delivery',
          description: `Fast store-to-door delivery within ${durationMins} minutes`,
          duration_minutes: durationMins,
          earliest_fulfillment_time: earliest,
          latest_fulfillment_time: latest,
          buyer_facing_description: buyerDesc,
          fulfillment_location: location
        });
      }

      fulfillmentOptions.push({
        type: 'STANDARD_DELIVERY',
        title: 'Standard Home Delivery',
        description: 'Doorstep delivery via Sangeetha logistics network',
        duration_minutes: durationMins || 1440,
        earliest_fulfillment_time: earliest,
        latest_fulfillment_time: latest,
        buyer_facing_description: `Delivery by ${eta?.eta_date || 'Standard SLA'}`,
        fulfillment_location: location
      });

      if (location && location.type === 'STORE') {
        fulfillmentOptions.push({
          type: 'PICKUP',
          title: 'Store Pickup',
          description: `Collect in person at ${location.name}`,
          duration_minutes: 30,
          earliest_fulfillment_time: earliest,
          latest_fulfillment_time: latest,
          buyer_facing_description: `Ready for pickup in 30 mins at ${location.name}`,
          fulfillment_location: location
        });
      }
    }

    return {
      postal_code: pincode,
      location,
      availability,
      shipping: {
        serviceable: isPincodeValid,
        header_eta: pincodeData?.header_eta || eta?.eta,
        delivery_location: city
      },
      pickup: {
        available: Boolean(location && location.type === 'STORE' && availability.is_deliverable),
        store_name: location?.name
      },
      fulfillment_options: fulfillmentOptions,
      earliest_fulfillment_time: earliest,
      latest_fulfillment_time: latest,
      buyer_facing_description: buyerDesc,
      _sangeetha_internal: {
        raw_eta_title: eta?.eta_title,
        store_code: eta?.store_code,
        store_type_id: eta?.store_type,
        stock_status_raw: eta?.stock_status ?? inStockFlag,
        delivery_icon: eta?.delivery_icon || pincodeData?.delivery_icon || undefined,
        is_drop_shipment: eta?.is_drop_shipment,
        level: eta?.level
      }
    };
  }

  /**
   * Maps a Sangeetha Product Search / Detail item to UcpProductSummary
   */
  public static mapProductToSummary(
    item: SangeethaProductListItem | SangeethaProductDetailItem,
    pincode: string,
    pincodeData?: SangeethaPincodeEtaData,
    overrideEta?: SangeethaProductEta
  ): UcpProductSummary {
    const rawEta = overrideEta || (Array.isArray(item.product_eta) ? item.product_eta[0] : item.product_eta);
    const salePrice = parseFloat(item.sale_price || item.mop || '0');
    const mrp = parseFloat(item.mrp || item.sale_price || '0');
    const mop = item.mop ? parseFloat(item.mop) : undefined;
    const savings = mrp > salePrice ? mrp - salePrice : 0;

    let imageUrl: string | undefined;
    if ('image_details' in item && Array.isArray(item.image_details) && item.image_details[0]?.file_url) {
      imageUrl = item.image_details[0].file_url;
    }

    const fulfillment = this.mapToUcpFulfillment(
      pincode,
      rawEta,
      pincodeData,
      'in_stock' in item ? item.in_stock : undefined
    );

    return {
      product_id: String(item.product_id),
      item_code: item.item_code,
      title: item.item_fullname || item.title,
      brand: item.brand_name || (item.title ? item.title.split(' ')[0] : 'Unknown'),
      color: item.color,
      price: {
        currency: 'INR',
        mrp,
        sale_price: salePrice,
        mop,
        savings
      },
      image_url: imageUrl,
      fulfillment
    };
  }
}
