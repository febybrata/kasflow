import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const enableGoogleLogin =
    process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true" ||
    process.env.ENABLE_GOOGLE_LOGIN === "true";

  return NextResponse.json({
    enableGoogleLogin,
  });
}
