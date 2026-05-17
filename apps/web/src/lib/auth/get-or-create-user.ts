import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";

export async function getOrCreateUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  let user = await db.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        avatarUrl: clerkUser.imageUrl ?? null,
      },
    });
  }

  return user;
}
