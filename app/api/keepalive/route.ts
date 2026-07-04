import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Keep-alive endpoint.
 *
 * Dipanggil oleh Vercel Cron (lihat vercel.json) untuk menjaga
 * Supabase Free project tetap aktif agar tidak dipause karena
 * tidak ada aktivitas (threshold: 7 hari).
 *
 * Query paling minimal yang mungkin: SELECT 1 kolom, LIMIT 1,
 * pada tabel business_profiles (pasti ada di semua deployment).
 */

// Selalu dinamis — tidak boleh di-cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { error } = await supabase
      .from("business_profiles")
      .select("id")
      .limit(1);

    if (error) {
      console.error("[keepalive] Supabase error:", error.message);
      return NextResponse.json(
        { status: "error", timestamp },
        { status: 500 },
      );
    }

    return NextResponse.json({ status: "ok", timestamp });
  } catch (err) {
    console.error("[keepalive] Unexpected error:", err);
    return NextResponse.json(
      { status: "error", timestamp },
      { status: 500 },
    );
  }
}
