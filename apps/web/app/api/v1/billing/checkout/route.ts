import { withAuth } from "@/lib/api/middleware";
import { internalError } from "@/lib/api/response";
import { NextResponse } from "next/server";

// Razorpay checkout — stub for now, wire up when billing is configured
export const POST = withAuth(async (_req, _ctx) => {
  return NextResponse.json(
    { error: { code: "NOT_IMPLEMENTED", message: "Billing not yet configured. Contact support." } },
    { status: 503 }
  );
});
