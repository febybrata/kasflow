// ============================================================
// SHOPEE API TYPES
// ============================================================

export type ShopeeTokenResponse = {
  access_token: string;
  refresh_token: string;
  expire_in: number; // Expire duration in seconds
  shop_id?: number;
};

export type ShopeeShopInfo = {
  shop_id: number;
  shop_name: string;
  region: string;
};

export type ShopeeIncomeDetail = {
  order_sn: string;
  buyer_payment_method: string;
  income_amount: number;
  revenue_amount: number;
  platform_fee: number;
  adjustment_amount: number;
  shipping_fee: number;
  voucher_seller: number;
  voucher_shopee: number;
  release_time: number; // Unix timestamp
};

export type ShopeeOrder = {
  order_sn: string;
  order_status: string;
  create_time: number; // Unix timestamp
  update_time: number; // Unix timestamp
  total_amount: number;
  buyer_user_id?: number;
  shipping_carrier?: string;
};

export type ShopeeOrderItem = {
  item_id: number;
  item_name: string;
  model_id?: number;
  model_name?: string;
  model_quantity_purchased: number;
  model_original_price: number;
  model_discounted_price: number;
};

export type ShopeeApiResponse<T> = {
  error: string;
  message: string;
  request_id: string;
  response: T;
};
