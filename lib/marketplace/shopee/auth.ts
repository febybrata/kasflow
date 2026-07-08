import { generateSign } from "./client";
import type { ShopeeTokenResponse } from "./types";

const BASE_URL_PROD = "https://partner.shopeemobile.com";
const BASE_URL_SANDBOX = "https://openplatform.sandbox.test-stable.shopee.sg";

export type ShopeeOAuthConfig = {
  partnerId: number;
  partnerKey: string;
  redirectUri: string;
};

function getBaseUrl(): string {
  const isSandbox = process.env.SHOPEE_IS_SANDBOX === "true";
  return isSandbox ? BASE_URL_SANDBOX : BASE_URL_PROD;
}

export function generateAuthUrl(config: ShopeeOAuthConfig): string {
  const isSandbox = process.env.SHOPEE_IS_SANDBOX === "true";

  if (isSandbox) {
    const parsedRedirect = new URL(config.redirectUri);
    const state = parsedRedirect.searchParams.get("state") || "";
    // Remove state parameter from redirectUri so that redirect_uri is a clean domain match
    parsedRedirect.searchParams.delete("state");
    const cleanRedirectUri = parsedRedirect.toString();

    const sandboxUrl = new URL("https://open.sandbox.test-stable.shopee.com/auth");
    sandboxUrl.searchParams.append("auth_type", "seller");
    sandboxUrl.searchParams.append("partner_id", config.partnerId.toString());
    sandboxUrl.searchParams.append("redirect_uri", cleanRedirectUri);
    sandboxUrl.searchParams.append("response_type", "code");
    if (state) {
      sandboxUrl.searchParams.append("state", state);
    }
    return sandboxUrl.toString();
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/shop/auth_partner";
  const baseUrl = getBaseUrl();

  const sign = generateSign(
    apiPath,
    config.partnerId,
    config.partnerKey,
    timestamp
  );

  const url = new URL(`${baseUrl}${apiPath}`);
  url.searchParams.append("partner_id", config.partnerId.toString());
  url.searchParams.append("timestamp", timestamp.toString());
  url.searchParams.append("sign", sign);
  url.searchParams.append("redirect", config.redirectUri);

  return url.toString();
}

/**
 * Exchange authorization code for access token
 * 
 * Path: /api/v2/auth/token/get
 */
export async function exchangeAuthCode(
  config: ShopeeOAuthConfig,
  authCode: string,
  shopId: number
): Promise<ShopeeTokenResponse> {
  const { shopeeApiPost } = await import("./client");

  const data = await shopeeApiPost<ShopeeTokenResponse>(
    "/api/v2/auth/token/get",
    config.partnerId,
    config.partnerKey,
    undefined, // No access token for public APIs
    undefined, // No shop ID in query for token generation
    {
      code: authCode,
      partner_id: config.partnerId,
      shop_id: shopId,
    }
  );

  return data;
}

/**
 * Refresh access token
 * 
 * Path: /api/v2/auth/access_token/get
 */
export async function refreshAccessToken(
  config: ShopeeOAuthConfig,
  refreshToken: string,
  shopId: number
): Promise<ShopeeTokenResponse> {
  const { shopeeApiPost } = await import("./client");

  const data = await shopeeApiPost<ShopeeTokenResponse>(
    "/api/v2/auth/access_token/get",
    config.partnerId,
    config.partnerKey,
    undefined,
    undefined,
    {
      refresh_token: refreshToken,
      partner_id: config.partnerId,
      shop_id: shopId,
    }
  );

  return data;
}

/**
 * Check if access token needs refresh (expires in 4 hours, refresh if < 30 minutes left)
 */
export function shouldRefreshToken(expiresAt: string | undefined): boolean {
  if (!expiresAt) return true;

  const expiresAtDate = new Date(expiresAt).getTime();
  const now = Date.now();
  const thirtyMinutesMs = 30 * 60 * 1000;

  // Refresh if expires in less than 30 minutes
  return expiresAtDate - now < thirtyMinutesMs;
}
