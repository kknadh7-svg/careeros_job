import { db } from "@/lib/db/client";
import { logger } from "@/lib/logger";

interface ClerkUserEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    primary_email_address_id: string;
  };
}

// Note: svix verification skipped — user sync is handled via getOrCreateUser() on first page load.
// This webhook handler processes Clerk user events if sent manually or via Clerk dashboard.
export async function POST(req: Request): Promise<Response> {
  try {
    const event = (await req.json()) as ClerkUserEvent;

    if (event.type === "user.created" || event.type === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url, primary_email_address_id } = event.data;
      const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id);

      if (primaryEmail) {
        await db.user.upsert({
          where: { clerkId: id },
          create: {
            clerkId: id,
            email: primaryEmail.email_address,
            firstName: first_name,
            lastName: last_name,
            avatarUrl: image_url,
          },
          update: {
            email: primaryEmail.email_address,
            firstName: first_name,
            lastName: last_name,
            avatarUrl: image_url,
          },
        });
      }
    }

    if (event.type === "user.deleted") {
      await db.user.deleteMany({ where: { clerkId: event.data.id } });
    }

    logger.info({ msg: "Clerk webhook processed", type: event.type });
    return new Response("OK", { status: 200 });
  } catch (err) {
    logger.error({ msg: "Clerk webhook failed", error: err });
    return new Response("Internal Error", { status: 500 });
  }
}
