"use client";

import { useAuth } from "@/components/Auth";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      window.location.href = "/login";
    }
  }, [user, loading, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-800 dark:border-t-indigo-400" />
      </div>
    );
  }

  if (!user) return null;

  if (!user.is_approved) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-sm rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Account Pending Approval</p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Your account is waiting for administrator approval.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
