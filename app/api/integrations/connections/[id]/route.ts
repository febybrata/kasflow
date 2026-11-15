import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { companyId, display_name } = body;

    if (!id || !companyId) {
      return NextResponse.json(
        { error: "connection id and companyId are required" },
        { status: 400 }
      );
    }

    console.log(`[Update Connection] Updating alias for ${id}`);

    // Clean up empty strings to null
    const newDisplayName = display_name?.trim() ? display_name.trim() : null;

    // Select only safe metadata columns (never expose access_token or refresh_token to client)
    const safeColumns = "id,company_id,platform,shop_id,shop_name,display_name,shop_cipher,region,seller_type,token_expires_at,refresh_token_expires_at,last_sync_at,sync_start_date,status,created_at,updated_at";
    const response = await fetch(
      `${supabaseUrl}/rest/v1/marketplace_connections?select=${safeColumns}&id=eq.${id}&company_id=eq.${encodeURIComponent(companyId)}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation", // return the updated row
        },
        body: JSON.stringify({
          display_name: newDisplayName,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Update Connection] REST API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to update connection", details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data: data[0] || null,
    });
  } catch (error) {
    console.error("[Update Connection] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
