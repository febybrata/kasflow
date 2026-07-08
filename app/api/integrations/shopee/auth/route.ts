// ============================================================
// SHOPEE OAUTH REDIRECT
// ============================================================
// Initiates OAuth flow by redirecting user to Shopee authorization page
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { generateAuthUrl } from "@/lib/marketplace/shopee/auth";

const shopeePartnerId = Number(process.env.SHOPEE_PARTNER_ID!);
const shopeePartnerKey = process.env.SHOPEE_PARTNER_KEY!;
const redirectUri = process.env.NEXT_PUBLIC_APP_URL + "/api/integrations/shopee/callback";

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    if (isNaN(shopeePartnerId) || !shopeePartnerKey) {
      return NextResponse.json(
        { error: "Shopee Partner ID or Partner Key environment variables not configured" },
        { status: 500 }
      );
    }

    // Embed companyId in the redirect query parameter by adding it as state
    const customRedirectUri = `${redirectUri}?state=${companyId}`;

    // Build Shopee OAuth URL
    const authUrl = generateAuthUrl({
      partnerId: shopeePartnerId,
      partnerKey: shopeePartnerKey,
      redirectUri: customRedirectUri,
    });

    console.log("[Shopee OAuth] Redirecting to:", authUrl);

    return NextResponse.json({
      authUrl,
    });
  } catch (error) {
    console.error("[Shopee OAuth] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
