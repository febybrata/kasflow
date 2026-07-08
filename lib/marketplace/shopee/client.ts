import crypto from "crypto";
import type { ShopeeApiResponse } from "./types";

const BASE_URL_PROD = "https://partner.shopeemobile.com";
const BASE_URL_SANDBOX = "https://openplatform.sandbox.test-stable.shopee.sg";

/**
 * Generate HMAC-SHA256 signature for Shopee Open API v2
 * 
 * Base String format:
 * - Public API: partner_id + api_path + timestamp
 * - Shop API: partner_id + api_path + timestamp + access_token + shop_id
 */
export function generateSign(
  path: string,
  partnerId: number,
  partnerKey: string,
  timestamp: number,
  accessToken?: string,
  shopId?: number
): string {
  let baseString = `${partnerId}${path}${timestamp}`;
  if (accessToken) baseString += accessToken;
  if (shopId) baseString += shopId;

  return crypto
    .createHmac("sha256", partnerKey)
    .update(baseString)
    .digest("hex");
}

function getBaseUrl(): string {
  const isSandbox = process.env.SHOPEE_IS_SANDBOX === "true";
  return isSandbox ? BASE_URL_SANDBOX : BASE_URL_PROD;
}

/**
 * Make GET request to Shopee Open API v2
 */
export async function shopeeApiGet<T = any>(
  path: string,
  partnerId: number,
  partnerKey: string,
  accessToken?: string,
  shopId?: number,
  extraParams: Record<string, string | number | undefined> = {}
): Promise<T> {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = generateSign(path, partnerId, partnerKey, timestamp, accessToken, shopId);
  const baseUrl = getBaseUrl();

  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.append("partner_id", partnerId.toString());
  url.searchParams.append("timestamp", timestamp.toString());
  url.searchParams.append("sign", sign);

  if (accessToken) {
    url.searchParams.append("access_token", accessToken);
  }
  if (shopId) {
    url.searchParams.append("shop_id", shopId.toString());
  }

  // Append other params
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = (await response.json()) as any;

  if (result.error && result.error !== "") {
    throw new Error(`Shopee API Error ${result.error}: ${result.message}`);
  }

  return (result.response !== undefined) ? result.response : (result as T);
}

/**
 * Make POST request to Shopee Open API v2
 */
export async function shopeeApiPost<T = any>(
  path: string,
  partnerId: number,
  partnerKey: string,
  accessToken?: string,
  shopId?: number,
  body: any = {},
  extraParams: Record<string, string | number | undefined> = {}
): Promise<T> {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = generateSign(path, partnerId, partnerKey, timestamp, accessToken, shopId);
  const baseUrl = getBaseUrl();

  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.append("partner_id", partnerId.toString());
  url.searchParams.append("timestamp", timestamp.toString());
  url.searchParams.append("sign", sign);

  if (accessToken) {
    url.searchParams.append("access_token", accessToken);
  }
  if (shopId) {
    url.searchParams.append("shop_id", shopId.toString());
  }

  // Append other params
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = (await response.json()) as any;

  if (result.error && result.error !== "") {
    throw new Error(`Shopee API Error ${result.error}: ${result.message}`);
  }

  return (result.response !== undefined) ? result.response : (result as T);
}
