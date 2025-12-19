import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayoutClient } from "./layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, org_id, org_role")
    .eq("id", user.id)
    .single();

  const userProfile = profile || {
    email: user.email || "",
    full_name: null,
  };

  return (
    <DashboardLayoutClient user={userProfile}>
      {children}
    </DashboardLayoutClient>
  );
}
