import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, MessageSquare, FileText, Plus } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
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
      organization:organizations(name)
    `
    )
    .eq("id", user?.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your legal workspace
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card variant="featured" className="hover:shadow-glow transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <FolderOpen
                className="h-8 w-8 text-primary"
                strokeWidth={1.5}
              />
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href="/matters/new">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardTitle className="text-lg">Matters</CardTitle>
            <CardDescription>
              Manage your legal matters and documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/matters">View Matters</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <MessageSquare
                className="h-8 w-8 text-primary"
                strokeWidth={1.5}
              />
            </div>
            <CardTitle className="text-lg">Counsel</CardTitle>
            <CardDescription>
              AI-powered legal research and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/counsel">Start Chat</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
            <CardTitle className="text-lg">Documents</CardTitle>
            <CardDescription>
              Browse and search your document library
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/documents">View Documents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Complete these steps to set up your Orderly workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium">Create your first matter</p>
                <p className="text-sm text-muted-foreground">
                  Organise your legal work into matters
                </p>
              </div>
              <Button variant="default" size="sm" asChild>
                <Link href="/matters/new">Create Matter</Link>
              </Button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium text-muted-foreground">
                  Upload documents
                </p>
                <p className="text-sm text-muted-foreground">
                  Add contracts, briefs, and legal documents
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium text-muted-foreground">
                  Start using Counsel
                </p>
                <p className="text-sm text-muted-foreground">
                  Ask questions about your documents
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



