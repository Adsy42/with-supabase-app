import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import Link from "next/link";

export default async function MattersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's matters
  const { data: matters } = await supabase
    .from("matters")
    .select(
      `
      id,
      title,
      client_name,
      matter_type,
      status,
      created_at,
      matter_members!inner(user_id)
    `
    )
    .eq("matter_members.user_id", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matters</h1>
          <p className="text-muted-foreground">
            Manage your legal matters and cases
          </p>
        </div>
        <Button variant="gradient" asChild>
          <Link href="/matters/new">
            <Plus className="mr-2 h-4 w-4" />
            New Matter
          </Link>
        </Button>
      </div>

      {/* Matters List */}
      {matters && matters.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matters.map((matter) => (
            <Link key={matter.id} href={`/matters/${matter.id}`}>
              <Card className="h-full hover:shadow-glow-sm transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{matter.title}</CardTitle>
                      {matter.client_name && (
                        <CardDescription>{matter.client_name}</CardDescription>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        matter.status === "active"
                          ? "bg-success/10 text-success"
                          : matter.status === "archived"
                            ? "bg-muted text-muted-foreground"
                            : "bg-warning/10 text-warning"
                      }`}
                    >
                      {matter.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {matter.matter_type && (
                      <span className="capitalize">{matter.matter_type}</span>
                    )}
                    <span>•</span>
                    <span>
                      {new Date(matter.created_at).toLocaleDateString("en-AU")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No matters yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Get started by creating your first matter to organise your legal
              work.
            </p>
            <Button variant="gradient" asChild>
              <Link href="/matters/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Matter
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

