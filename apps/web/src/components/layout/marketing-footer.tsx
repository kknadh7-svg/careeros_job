import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border py-8 md:py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="text-lg font-bold text-primary">CareerOS</div>
          <div className="flex gap-4 sm:gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground py-1 px-1">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground py-1 px-1">Terms</Link>
            <Link href="/sign-in" className="hover:text-foreground py-1 px-1">Sign In</Link>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground text-center md:text-right">
            © {new Date().getFullYear()} CareerOS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
