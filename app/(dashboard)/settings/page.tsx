import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, updateOrganization } from "@/actions/auth";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user profile with organization
  const { data: profile } = await supabase
    .from("users")
    .select(
      `
      full_name,
      email,
      org_role,
      organization:organizations(id, name)
    `
    )
    .eq("id", user?.id)
    .single();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and organisation settings
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                defaultValue={profile?.full_name || ""}
                placeholder="John Smith"
              />
            </div>
            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      {/* Organisation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Organisation</CardTitle>
          <CardDescription>
            Manage your organisation settings
            {profile?.org_role && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {profile.org_role}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateOrganization} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org_name">Organisation Name</Label>
              <Input
                id="org_name"
                name="name"
                type="text"
                defaultValue={
                  (profile?.organization as { name?: string })?.name || ""
                }
                placeholder="Smith & Associates"
                disabled={!["owner", "admin"].includes(profile?.org_role || "")}
              />
              {!["owner", "admin"].includes(profile?.org_role || "") && (
                <p className="text-xs text-muted-foreground">
                  Only owners and admins can edit organisation settings
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={!["owner", "admin"].includes(profile?.org_role || "")}
            >
              Save Organisation
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" disabled>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
