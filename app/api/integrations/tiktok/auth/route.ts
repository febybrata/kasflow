// ============================================================
// TIKTOK OAUTH REDIRECT
// ============================================================
// Initiates OAuth flow by redirecting user to TikTok authorization page
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const tiktokAppKey = process.env.TIKTOK_APP_KEY!;
const redirectUri = process.env.TIKTOK_REDIRECT_URI!;

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    // Generate state with companyId embedded for callback
    const state = `${companyId}_${crypto.randomUUID()}`;

    // Build TikTok OAuth URL
    const authUrl = new URL("https://auth.tiktok-shops.com/oauth/authorize");
    authUrl.searchParams.append("app_key", tiktokAppKey);
    // Use Centralized Auth Broker
    const targetObj = { target: process.env.NEXT_PUBLIC_APP_URL, originalState: state };
    const stateBase64 = Buffer.from(JSON.stringify(targetObj)).toString("base64");
    const authBrokerUrl = "https://auth.bakwan.my.id/api/callback";

    authUrl.searchParams.append("state", stateBase64);
    authUrl.searchParams.append("redirect_uri", authBrokerUrl);

    console.log("[OAuth] Redirecting to:", authUrl.toString());

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state,
    });
  } catch (error) {
    console.error("[OAuth] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
