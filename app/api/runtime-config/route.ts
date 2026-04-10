import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getRequiredEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value && !fallback) {
    console.warn(`Missing environment variable: ${name}`);
  }
  return value || "";
}

export async function GET() {
  return NextResponse.json({
    apiBaseUrl: getRequiredEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:5005/api"),
    targetOrganization: getRequiredEnv("TARGET_ORGANIZATION", ""),
    targetDescription: getRequiredEnv("TARGET_DESCRIPTION", ""),
    sourceDescription: getRequiredEnv("SOURCE_DESCRIPTION", ""),
    mode: getRequiredEnv("MODE", "GH"),
  });
}
