"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardTopBar() {
  return (
    <header className="hidden md:flex h-14 items-center justify-between border-b border-border px-6">
      <div />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
