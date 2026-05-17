import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-xl font-bold text-primary">CareerOS</div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/sign-in" className="hover:text-foreground">Sign In</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CareerOS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
