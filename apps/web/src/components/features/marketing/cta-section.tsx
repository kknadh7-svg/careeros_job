import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Ready to Land Your Dream Job?</h2>
        <p className="mt-3 md:mt-4 text-sm sm:text-base md:text-lg text-muted-foreground">
          Join thousands of job seekers using AI to get hired faster.
        </p>
        <div className="mt-6 md:mt-8 flex flex-col items-stretch sm:items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href="/sign-up">Get Started Free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs sm:text-sm text-muted-foreground">No credit card required</p>
      </div>
    </section>
  );
}
