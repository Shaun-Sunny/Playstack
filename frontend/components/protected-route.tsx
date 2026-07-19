"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/auth-context";
import type { Role } from "@/lib/ems";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: Role[];
  redirectTo?: string;
};

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/dashboard",
}: ProtectedRouteProps) {
  const router = useRouter();
  const { loading, user } = useAuth();
  const roleAllowed =
    !allowedRoles || (typeof user?.role === "string" && allowedRoles.includes(user.role as Role));

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (!loading && user && !roleAllowed) {
      router.replace(redirectTo);
    }
  }, [loading, redirectTo, roleAllowed, router, user]);

  if (loading || !user || !roleAllowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">
        Checking access...
      </div>
    );
  }

  return children;
}