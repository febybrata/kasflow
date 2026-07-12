// ============================================================
// SHOPEE OAUTH CALLBACK
// ============================================================
// Handles callback from Shopee after user authorization.
// Exchanges auth_code for access_token and saves connection.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { exchangeAuthCode } from "@/lib/marketplace/shopee/auth";
import { shopeeApiGet } from "@/lib/marketplace/shopee/client";
import { uid } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const shopeePartnerId = Number(process.env.SHOPEE_PARTNER_ID!);
const shopeePartnerKey = process.env.SHOPEE_PARTNER_KEY!;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const shopIdStr = searchParams.get("shop_id");
    const stateParam = searchParams.get("state");
    let companyId = stateParam;
    try {
      if (stateParam) {
        const decoded = JSON.parse(Buffer.from(stateParam, "base64").toString("utf-8"));
        if (decoded && decoded.originalState) {
          companyId = decoded.originalState;
        }
      }
    } catch (e) {
      // Fallback to stateParam if not Base64 encoded JSON
    }

    if (!code || !shopIdStr || !companyId) {
      return NextResponse.json(
        { error: "Missing code, shop_id, or state parameter" },
        { status: 400 }
      );
    }

    const shopId = Number(shopIdStr);
    if (isNaN(shopId)) {
      return NextResponse.json(
        { error: "Invalid shop_id parameter" },
        { status: 400 }
      );
    }

    console.log(`[Shopee Callback] Received code for shop ${shopId} and company ${companyId}`);

    // Initialize Supabase Client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Exchange auth_code for access_token
    console.log("[Shopee Callback] Exchanging auth code for tokens...");
    const tokenData = await exchangeAuthCode(
      {
        partnerId: shopeePartnerId,
        partnerKey: shopeePartnerKey,
        redirectUri: process.env.NEXT_PUBLIC_APP_URL + "/api/integrations/shopee/callback",
      },
      code,
      shopId
    );

    console.log("[Shopee Callback] Token exchange successful");

    // Fetch shop profile to get shop name
    let shopName = `Shopee Shop ${shopId}`;
    let region = "ID";
    try {
      console.log("[Shopee Callback] Fetching shop info...");
      const shopInfo = await shopeeApiGet<any>(
        "/api/v2/shop/get_shop_info",
        shopeePartnerId,
        shopeePartnerKey,
        tokenData.access_token,
        shopId
      );
      if (shopInfo && shopInfo.shop_name) {
        shopName = shopInfo.shop_name;
        region = shopInfo.region || "ID";
      }
    } catch (err) {
      console.error("[Shopee Callback] Failed to fetch shop info:", err);
    }

    const now = new Date().toISOString();
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expire_in || 14400) * 1000).toISOString();
    // Refresh token typically lasts 30 days
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from("marketplace_connections")
      .select("*")
      .eq("company_id", companyId)
      .eq("platform", "shopee")
      .eq("shop_id", shopIdStr)
      .maybeSingle();

    let connectionId = "";

    if (existingConnection) {
      connectionId = existingConnection.id;
      console.log("[Shopee Callback] Connection exists, updating tokens...");
      await supabase
        .from("marketplace_connections")
        .update({
          shop_name: shopName,
          region,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt,
          refresh_token_expires_at: refreshTokenExpiresAt,
          status: "active",
          updated_at: now,
          deleted_at: null, // restore if soft deleted
        })
        .eq("id", connectionId);
    } else {
      connectionId = uid("mkp_conn");
      console.log("[Shopee Callback] Creating new connection...");
      await supabase
        .from("marketplace_connections")
        .insert({
          id: connectionId,
          company_id: companyId,
          platform: "shopee",
          shop_id: shopIdStr,
          shop_name: shopName,
          shop_cipher: shopIdStr, // for Shopee, shop_cipher is identical to shop_id
          region,
          seller_type: "local",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt,
          refresh_token_expires_at: refreshTokenExpiresAt,
          status: "active",
          created_at: now,
          updated_at: now,
        });

      // Create default account mappings for the new connection
      console.log("[Shopee Callback] Creating default account mappings...");
      const defaultMappings = [
        {
          id: uid("mkp_map"),
          connection_id: connectionId,
          company_id: companyId,
          mapping_type: "revenue",
          kasflow_category_id: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: uid("mkp_map"),
          connection_id: connectionId,
          company_id: companyId,
          mapping_type: "platform_fee",
          kasflow_category_id: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: uid("mkp_map"),
          connection_id: connectionId,
          company_id: companyId,
          mapping_type: "receivable",
          kasflow_account_id: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: uid("mkp_map"),
          connection_id: connectionId,
          company_id: companyId,
          mapping_type: "settlement_bank",
          kasflow_account_id: null,
          created_at: now,
          updated_at: now,
        },
      ];

      await supabase.from("marketplace_account_mapping").insert(defaultMappings);
    }

    console.log("[Shopee Callback] Shopee connection processed successfully:", connectionId);

    // Redirect back to integrations page
    const redirectUrl = new URL("/integrations", process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin);
    redirectUrl.searchParams.append("connected", "true");
    redirectUrl.searchParams.append("connectionId", connectionId);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[Shopee Callback] Error:", error);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 }
    );
  }
}
