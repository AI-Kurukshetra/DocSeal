"use client";

import { Suspense, useTransition } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Topbar } from "./topbar";
import { logout } from "@/features/auth/actions";
import type { Profile } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardShellProps {
  profile: Profile;
  children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [, startTransition] = useTransition();

  function handleLogout() {
    startTransition(() => {
      void logout();
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar profile={profile} onLogout={handleLogout} />
      <MobileNav profile={profile} onLogout={handleLogout} />

      <div className="md:pl-64">
        <Topbar />
        <main className="p-6 md:p-8">
          <Suspense
            fallback={
              <div className="space-y-6">
                <Skeleton className="h-6 w-48" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
