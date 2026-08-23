"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const links = [
  { href: "/chat", label: "Chat" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Fiscora<span className="font-normal text-white/50">.ai</span>
        </Link>

        {isAuthenticated && (
          <div className="flex items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`pill${pathname === link.href ? " pill-active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
            <button onClick={logout} className="btn btn-ghost">
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
