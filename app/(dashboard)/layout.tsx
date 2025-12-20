/**
 * Dashboard Layout
 * Server Component that handles auth and renders the dashboard shell
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayoutClient } from "@/components/layout/dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Always use getUser() not getSession() for security
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // Get user profile data
  const userProfile = {
    email: user.email,
    full_name: user.user_metadata?.full_name ?? null,
  };

  return (
    <DashboardLayoutClient user={userProfile}>{children}</DashboardLayoutClient>
  );
}

