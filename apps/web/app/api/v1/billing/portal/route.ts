import { withAuth } from "@/lib/api/middleware";
import { NextResponse } from "next/server";

// Billing portal stub — wire up Razorpay when billing is configured
export const POST = withAuth(async (_req, _ctx) => {
  return NextResponse.json(
    { error: { code: "NOT_IMPLEMENTED", message: "Billing portal not yet configured." } },
    { status: 503 }
  );
});
