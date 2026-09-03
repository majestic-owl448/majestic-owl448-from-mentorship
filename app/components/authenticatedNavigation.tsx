"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutAppSession } from "@/app/hooks/useAppSession";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

export function AuthenticatedNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  async function onSignOut() {
    await signOutAppSession();
    router.push("/auth");
  }

  return (
    <nav aria-label="Authenticated navigation" className="flex flex-wrap items-center gap-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className="text-sm font-medium underline underline-offset-4"
        >
          {link.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={onSignOut}
        className="text-sm font-medium underline underline-offset-4"
      >
        Sign out
      </button>
    </nav>
  );
}
