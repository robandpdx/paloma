import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api",
    targetOrganization: process.env.TARGET_ORGANIZATION || "",
    targetDescription: process.env.TARGET_DESCRIPTION || "",
    sourceDescription: process.env.SOURCE_DESCRIPTION || "",
    mode: process.env.MODE || "GH",
  });
}
