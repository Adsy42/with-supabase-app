"use client";

/**
 * Dashboard Layout Client Component
 * Client-side wrapper with sidebar, header, and sign out functionality
 */

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";

interface DashboardLayoutClientProps {
  user: {
    email?: string;
    full_name?: string | null;
  };
  children: React.ReactNode;
}

export function DashboardLayoutClient({
  user,
  children,
}: DashboardLayoutClientProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar onSignOut={handleSignOut} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader user={user} onSignOut={handleSignOut} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}


