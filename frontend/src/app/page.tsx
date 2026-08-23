import type { Metadata } from "next";
import LandingHero from "@/components/LandingHero";

export const metadata: Metadata = {
  title: "Fiscora — Your Entire Financial Team, in One AI Agent",
  description:
    "Fiscora routes every question to a specialist agent for market research, investment comparison, budgeting, savings, and debt payoff -- then merges the answers into one clear plan.",
};

export default function Home() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900&family=Instrument+Serif:ital@1&display=swap"
        rel="stylesheet"
      />
      <LandingHero />
    </>
  );
}
