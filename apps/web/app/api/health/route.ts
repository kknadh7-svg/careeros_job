import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    database: "checking",
    users_table: "checking",
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

  try {
    const count = await db.user.count();
    checks.users_table = `ok (${count} users)`;
  } catch (e) {
    checks.users_table = `error: ${e instanceof Error ? e.message : "unknown"}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
