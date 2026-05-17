import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";

const ADMIN_CLERK_EMAILS = ["kknadh7@gmail.com"];

export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up requester's email from DB
  const requester = await db.user.findUnique({
    where: { clerkId: userId },
    select: { email: true },
  });

  if (!requester || !ADMIN_CLERK_EMAILS.includes(requester.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Upgrade the requester's own account to PRO
  const updated = await db.user.update({
    where: { clerkId: userId },
    data: { plan: "PRO" },
    select: { email: true, plan: true },
  });

  return Response.json({ success: true, email: updated.email, plan: updated.plan });
}
