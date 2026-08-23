"use client";

import { usePathname } from "next/navigation";

export default function ConditionalFooter() {
  const pathname = usePathname();
  // "/" (landing) is a locked single-viewport layout with its own footer;
  // "/chat" is a fixed-height flex column that already shows the disclaimer
  // inline next to the input -- an extra footer would overflow both.
  if (pathname === "/" || pathname === "/chat") return null;
  return (
    <footer className="border-t border-white/10 px-4 py-3 text-center text-[11px] text-white/50">
      Fiscora gives informational insights, not financial advice -- always confirm major decisions
      with a licensed professional.
    </footer>
  );
}
