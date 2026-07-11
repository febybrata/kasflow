// ============================================================
// SYNC ORDERS FOR SHOPEE
// ============================================================
// Fetch orders from Shopee Order API and cache them for analytics.
// Orders are NOT used to create KasFlow transactions — only statements.
// This is purely for dashboard/analytics purposes.
// ============================================================

import type { MarketplaceOrder, MarketplaceOrderItem } from "@/lib/types";
import { shopeeApiGet } from "./client";
import { uid } from "@/lib/utils";
import type { ShopeeOrder, ShopeeOrderItem } from "./types";

export type SyncOrdersParams = {
  accessToken: string;
  shopId: number;
  partnerId: number;
  partnerKey: string;
  companyId: string;
  connectionId: string;
  startDate?: string; // ISO date string "YYYY-MM-DD"
  endDate?: string; // ISO date string "YYYY-MM-DD"
};

export type SyncOrdersResult = {
  orders: MarketplaceOrder[];
  items: MarketplaceOrderItem[];
  fetched: number;
  created: number;
  updated: number;
};

function mapShopeeStatus(status: string): string {
  const s = status ? status.toUpperCase() : "";
  switch (s) {
    case "UNPAID":
      return "UNPAID";
    case "READY_TO_SHIP":
    case "RETRY_SHIP":
      return "AWAITING_SHIPMENT";
    case "SHIPPED":
    case "TO_CONFIRM_RECEIPT":
      return "IN_TRANSIT";
    case "COMPLETED":
      return "COMPLETED";
    case "TO_RETURN":
    case "CANCELLED":
    case "INVALID":
      return "CANCELLED";
    default:
      return s;
  }
}

/**
 * Convert Shopee Order to KasFlow MarketplaceOrder
 */
function convertToOrder(
  shopeeOrder: any,
  connectionId: string,
  companyId: string
): MarketplaceOrder {
  const now = new Date().toISOString();

  // Convert Unix timestamps to ISO strings
  const orderCreateTime = shopeeOrder.create_time
    ? new Date(shopeeOrder.create_time * 1000).toISOString()
    : undefined;
  const orderUpdateTime = shopeeOrder.update_time
    ? new Date(shopeeOrder.update_time * 1000).toISOString()
    : undefined;

  // Compute total amount (buyer_total_amount or total_amount)
  const totalAmount = parseFloat(shopeeOrder.buyer_total_amount || shopeeOrder.total_amount || "0") || 0;

  return {
    id: uid("mkp_order"),
    connectionId,
    companyId,
    platformOrderId: shopeeOrder.order_sn,
    platformStatus: mapShopeeStatus(shopeeOrder.order_status),
    orderCreateTime,
    orderUpdateTime,
    currency: "IDR",
    subtotal: totalAmount, // Shopee details might have subtotal, otherwise fallback to total
    shippingFee: parseFloat(shopeeOrder.estimated_shipping_fee || "0") || 0,
    sellerDiscount: 0, // voucher_seller from payment detail represents discounts
    platformDiscount: 0,
    totalAmount,
    settlementStatus: "unsettled",
    settlementAmount: totalAmount, // Show nominal value in dashboard
    revenueAmount: totalAmount,
    feeAmount: 0,
    adjustmentAmount: 0,
    shippingCostAmount: 0,
    syncStatus: "pending",
    rawData: shopeeOrder,
    buyerUserId: shopeeOrder.buyer_user_id ? String(shopeeOrder.buyer_user_id) : undefined,
    shippingProvider: shopeeOrder.shipping_carrier,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Convert Shopee Order Item to KasFlow MarketplaceOrderItem
 */
function convertToOrderItem(
  shopeeItem: any,
  orderId: string,
  companyId: string
): MarketplaceOrderItem {
  return {
    id: uid("mkp_item"),
    orderId,
    companyId,
    skuId: shopeeItem.model_sku || shopeeItem.item_sku || String(shopeeItem.model_id || shopeeItem.item_id),
    skuName: shopeeItem.model_name || "",
    productName: shopeeItem.item_name,
    quantity: shopeeItem.model_quantity_purchased || 1,
    unitPrice: parseFloat(shopeeItem.model_discounted_price || shopeeItem.model_original_price || "0") || 0,
    settlementAmount: parseFloat(shopeeItem.model_discounted_price || shopeeItem.model_original_price || "0") || 0,
    revenueAmount: parseFloat(shopeeItem.model_discounted_price || shopeeItem.model_original_price || "0") || 0,
    rawData: shopeeItem,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Fetch detailed order information for a list of order SNs
 */
async function fetchOrderDetails(
  partnerId: number,
  partnerKey: string,
  accessToken: string,
  shopId: number,
  orderSns: string[]
): Promise<any[]> {
  const batchSize = 50;
  const allOrders: any[] = [];

  for (let i = 0; i < orderSns.length; i += batchSize) {
    const batch = orderSns.slice(i, i + batchSize);
    
    const response = await shopeeApiGet<any>(
      "/api/v2/order/get_order_detail",
      partnerId,
      partnerKey,
      accessToken,
      shopId,
      {
        order_sn_list: batch.join(","),
        response_optional_fields: "item_list,buyer_user_id,shipping_carrier,buyer_total_amount,total_amount,estimated_shipping_fee",
      }
    );

    if (response && response.order_list) {
      allOrders.push(...response.order_list);
    }

    if (i + batchSize < orderSns.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return allOrders;
}

/**
 * Sync orders from Shopee API
 */
export async function syncOrders(params: SyncOrdersParams): Promise<SyncOrdersResult> {
  const {
    accessToken,
    shopId,
    partnerId,
    partnerKey,
    companyId,
    connectionId,
    startDate,
    endDate,
  } = params;

  // Prepare dates (unix timestamp)
  const totalTimeFrom = startDate
    ? Math.floor(new Date(`${startDate}T00:00:00+07:00`).getTime() / 1000)
    : Math.floor((Date.now() - 14 * 24 * 60 * 60 * 1000) / 1000); // default 14 days ago
  
  const totalTimeTo = endDate
    ? Math.floor(new Date(`${endDate}T23:59:59+07:00`).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const orderSns: string[] = [];
  const CHUNK_SIZE_SECONDS = 14 * 24 * 60 * 60; // 14 days

  let currentFrom = totalTimeFrom;

  // Step 1: Fetch order list (SNs only) chunked by max 14 days
  while (currentFrom <= totalTimeTo) {
    let currentTo = currentFrom + CHUNK_SIZE_SECONDS;
    if (currentTo > totalTimeTo) {
      currentTo = totalTimeTo;
    }

    let cursor = "";
    let hasMore = true;

    try {
      while (hasMore) {
        const extraParams: Record<string, any> = {
          time_range_field: "create_time",
          time_from: currentFrom,
          time_to: currentTo,
          page_size: 50,
        };

        if (cursor) {
          extraParams.cursor = cursor;
        }

        const response = await shopeeApiGet<any>(
          "/api/v2/order/get_order_list",
          partnerId,
          partnerKey,
          accessToken,
          shopId,
          extraParams
        );

        if (response && response.order_list) {
          response.order_list.forEach((ord: any) => {
            if (ord.order_sn) {
              orderSns.push(ord.order_sn);
            }
          });
        }

        hasMore = response?.has_more || false;
        cursor = response?.next_cursor || "";

        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    } catch (err) {
      console.error(`[Shopee SyncOrders] Failed to fetch chunk ${currentFrom} - ${currentTo}, continuing to next chunk:`, err);
    }

    currentFrom = currentTo + 1;
  }

  console.log(`[Shopee SyncOrders] Total orders listed: ${orderSns.length}`);

  // Step 2: Fetch detailed orders
  if (orderSns.length === 0) {
    return { orders: [], items: [], fetched: 0, created: 0, updated: 0 };
  }

  const shopeeOrders = await fetchOrderDetails(
    partnerId,
    partnerKey,
    accessToken,
    shopId,
    orderSns
  );

  // Convert to KasFlow format
  const orders: MarketplaceOrder[] = [];
  const items: MarketplaceOrderItem[] = [];

  for (const shopeeOrder of shopeeOrders) {
    const order = convertToOrder(shopeeOrder, connectionId, companyId);
    orders.push(order);

    if (shopeeOrder.item_list) {
      shopeeOrder.item_list.forEach((item: any) => {
        items.push(convertToOrderItem(item, order.id, companyId));
      });
    }
  }

  return {
    orders,
    items,
    fetched: orders.length,
    created: 0,
    updated: 0,
  };
}
