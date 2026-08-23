import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import ConditionalNavbar from "@/components/ConditionalNavbar";
import ConditionalFooter from "@/components/ConditionalFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description =
  "Your entire financial team, in one AI agent. Fiscora routes every question to a specialist for market research, investment comparison, budgeting, savings, and debt payoff -- then merges the answers into one clear plan.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Fiscora -- Your entire financial team, in one AI agent",
    template: "%s | Fiscora",
  },
  description,
  applicationName: "Fiscora",
  keywords: [
    "AI financial platform",
    "AI investment agent",
    "budgeting AI",
    "debt payoff planner",
    "stock research AI",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Fiscora",
    title: "Fiscora -- Your entire financial team, in one AI agent",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Fiscora -- Your entire financial team, in one AI agent",
    description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <AuthProvider>
          <ConditionalNavbar />
          <main className="flex-1">{children}</main>
          <ConditionalFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
