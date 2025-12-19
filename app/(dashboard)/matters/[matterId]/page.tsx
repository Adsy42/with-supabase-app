import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Edit,
  FileText,
  MessageSquare,
  Calendar,
  User,
  Briefcase,
} from "lucide-react";
import { DeleteMatterButton } from "@/components/matters/delete-matter-button";

interface MatterPageProps {
  params: Promise<{ matterId: string }>;
}

export default async function MatterPage({ params }: MatterPageProps) {
  const { matterId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Get matter with membership check
  const { data: matter } = await supabase
    .from("matters")
    .select(
      `
      *,
      matter_members!inner(user_id, role),
      created_by_user:users!matters_created_by_fkey(full_name, email)
    `
    )
    .eq("id", matterId)
    .eq("matter_members.user_id", user.id)
    .single();

  if (!matter) {
    notFound();
  }

  const userRole = matter.matter_members?.[0]?.role;
  const canEdit = ["owner", "editor"].includes(userRole);
  const canDelete = userRole === "owner";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link
              href="/matters"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Matters
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {matter.title}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
          {matter.client_name && (
            <p className="text-muted-foreground">{matter.client_name}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/matters/${matterId}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {canDelete && <DeleteMatterButton matterId={matterId} />}
        </div>
      </div>

      {/* Matter Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {matter.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {matter.description}
                </p>
              ) : (
                <p className="text-muted-foreground italic">
                  No description provided
                </p>
              )}
            </CardContent>
          </Card>

          {/* Documents Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>
                    Files and documents for this matter
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/matters/${matterId}/documents`}>
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload and manage documents
                </p>
                <Button variant="gradient" size="sm" asChild>
                  <Link href={`/matters/${matterId}/documents`}>
                    Upload Documents
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conversations Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Counsel Conversations</CardTitle>
                  <CardDescription>
                    AI conversations about this matter
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" disabled>
                  New Chat
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Start a conversation with Counsel
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Matter Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matter Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {matter.matter_number && (
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Matter Number
                    </p>
                    <p className="text-sm font-medium">{matter.matter_number}</p>
                  </div>
                </div>
              )}

              {matter.matter_type && (
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm font-medium capitalize">
                      {matter.matter_type}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {new Date(matter.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Created by</p>
                  <p className="text-sm font-medium">
                    {(matter.created_by_user as { full_name?: string; email?: string })?.full_name ||
                      (matter.created_by_user as { email?: string })?.email ||
                      "Unknown"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Your Role</p>
                  <p className="text-sm font-medium capitalize">{userRole}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/matters/${matterId}/documents`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Document
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <MessageSquare className="mr-2 h-4 w-4" />
                Ask Counsel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
