"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/auth-context";
import type { Role } from "@/lib/ems";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/organization", label: "Organization" },
];

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const role = user?.role as Role | undefined;
  const showCreateEmployee = role === "SUPER_ADMIN" || role === "HR";

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-900/80 px-5 py-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">EMS Portal</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {user?.name ?? "Signed in user"} · {user?.role ?? "UNKNOWN"}
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    active
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {showCreateEmployee ? (
              <Link
                href="/employees/new"
                className={`rounded-full px-4 py-2 text-sm transition ${
                  pathname === "/employees/new"
                    ? "bg-cyan-400 text-slate-950"
                    : "border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
                }`}
              >
                New Employee
              </Link>
            ) : null}
          </nav>
        </header>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
          {children}
        </div>
      </div>
    </main>
  );
}
