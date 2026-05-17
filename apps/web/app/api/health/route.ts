import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    database: "checking",
    clerk_pub_key: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "set" : "MISSING",
    clerk_secret: process.env.CLERK_SECRET_KEY ? "set" : "MISSING",
    database_url: process.env.DATABASE_URL ? "set" : "MISSING",
    openai: process.env.OPENAI_API_KEY ? "set" : "MISSING",
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (e) {
    checks.database = `error: ${e instanceof Error ? e.message : "unknown"}`;
  }

  const allOk = Object.values(checks).every((v) => v === "ok" || v === "set");

  return NextResponse.json(checks, { status: allOk ? 200 : 500 });
}
