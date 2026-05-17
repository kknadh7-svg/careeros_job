import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { z } from "zod";

const ADMIN_EMAILS = ["kknadh7@gmail.com"];

const bodySchema = z.object({
  email: z.string().email(),
  plan: z.enum(["FREE", "PRO"]),
});

export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify requester is admin
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const requesterEmail = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  if (!ADMIN_EMAILS.includes(requesterEmail)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, plan } = parsed.data;

  const updated = await db.user.updateMany({
    where: { email },
    data: { plan },
  });

  if (updated.count === 0) {
    return Response.json({ error: `No user found with email: ${email}` }, { status: 404 });
  }

  return Response.json({ success: true, email, plan, updated: updated.count });
}
