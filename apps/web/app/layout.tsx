import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CareerOS — AI-Powered Career Operating System",
    template: "%s | CareerOS",
  },
  description:
    "Find jobs, tailor your resume, auto-apply, and ace interviews with AI. The all-in-one career platform powered by GPT-4o.",
  keywords: [
    "AI resume builder",
    "job search",
    "career AI",
    "ATS optimizer",
    "mock interview",
    "job tracker",
    "resume tailoring",
  ],
  authors: [{ name: "CareerOS" }],
  creator: "CareerOS",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://careeros.app",
    title: "CareerOS — AI-Powered Career Operating System",
    description: "Find jobs, tailor your resume, auto-apply, and ace interviews with AI.",
    siteName: "CareerOS",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerOS",
    description: "AI-powered career platform that finds and applies to jobs for you.",
    creator: "@careeros_app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <NextTopLoader
                color="#6366f1"
                initialPosition={0.08}
                crawlSpeed={200}
                height={3}
                crawl={true}
                showSpinner={false}
                easing="ease"
                speed={200}
                shadow="0 0 10px #6366f1,0 0 5px #6366f1"
              />
              {children}
              <Toaster />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
