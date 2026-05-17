import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { getOrCreateUser } from "@/lib/auth/get-or-create-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Bell, Shield } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  await getOrCreateUser();

  const [clerkUserData, dbUser] = await Promise.all([
    currentUser(),
    db.user.findUnique({
      where: { clerkId },
      select: { email: true, firstName: true, lastName: true, plan: true, createdAt: true },
    }),
  ]);

  const plan = dbUser?.plan ?? "FREE";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <User className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">First Name</p>
              <p className="text-sm font-medium">{dbUser?.firstName ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last Name</p>
              <p className="text-sm font-medium">{dbUser?.lastName ?? "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <p className="text-sm font-medium">{dbUser?.email ?? clerkUserData?.emailAddresses[0]?.emailAddress ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Member Since</p>
            <p className="text-sm font-medium">
              {dbUser?.createdAt ? new Date(dbUser.createdAt).toLocaleDateString() : "—"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            To update your name, email, or profile picture, use the account menu in the sidebar.
          </p>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <CardTitle className="text-base">Subscription</CardTitle>
              <CardDescription>Your current plan and billing</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border/50">
            <div>
              <p className="font-semibold">{plan} Plan</p>
              <p className="text-sm text-muted-foreground">
                {plan === "FREE"
                  ? "1 resume, 5 saved jobs, basic features"
                  : plan === "PRO"
                  ? "Unlimited resumes, AI auto-apply, daily agent"
                  : "Everything in Pro + priority support"}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={
                plan === "FREE"
                  ? ""
                  : "bg-brand-500/15 text-brand-400 border-0"
              }
            >
              {plan}
            </Badge>
          </div>
          {plan === "FREE" && (
            <p className="text-sm text-muted-foreground">
              Upgrade to Pro to unlock AI auto-apply, unlimited resumes, and daily job discovery.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>Coming soon — email & push alerts for new matches</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Notification preferences will be available in the next update.</p>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <CardTitle className="text-base">Security</CardTitle>
              <CardDescription>Password and two-factor authentication</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Security settings are managed through your Clerk account. Click your profile picture in the sidebar to access security settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
