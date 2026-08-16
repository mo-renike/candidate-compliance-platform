"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/types";

type NavItem = {
  label: string;
  href: string;
  roles?: User["role"][];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Candidates", href: "/candidates" },
  {
    label: "AI Extraction",
    href: "/ai-extraction",
    roles: ["ADMIN", "RECRUITER"],
  },
];

interface AppHeaderProps {
  title: string;
  backHref?: string;
}

export function AppHeader({ title, backHref }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Candidate Compliance
          </p>

          <h1 className="text-xl font-bold text-slate-900">{title}</h1>

          {backHref && (
            <Link
              href={backHref}
              className="mt-1 inline-block text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              ← Back
            </Link>
          )}
        </div>

        <nav className="flex items-center gap-6">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "text-sm font-medium text-slate-900"
                    : "text-sm font-medium text-slate-600 hover:text-slate-900"
                }
              >
                {item.label}
              </Link>
            );
          })}

          <div className="ml-2 flex items-center gap-4 border-l border-slate-200 pl-6">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>

            <button
              onClick={handleLogout}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sign out
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
