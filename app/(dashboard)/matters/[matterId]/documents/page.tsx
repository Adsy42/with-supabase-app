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
import { ArrowLeft, FileText } from "lucide-react";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentList } from "@/components/documents/document-list";

interface DocumentsPageProps {
  params: Promise<{ matterId: string }>;
}

export default async function DocumentsPage({ params }: DocumentsPageProps) {
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
      id,
      title,
      matter_members!inner(user_id, role)
    `
    )
    .eq("id", matterId)
    .eq("matter_members.user_id", user.id)
    .single();

  if (!matter) {
    notFound();
  }

  // Get documents
  const { data: documents } = await supabase
    .from("documents")
    .select(
      `
      id,
      name,
      file_type,
      file_size,
      processing_status,
      is_restricted,
      created_at,
      uploader:users!documents_uploaded_by_fkey(full_name, email)
    `
    )
    .eq("matter_id", matterId)
    .order("created_at", { ascending: false });

  const userRole = matter.matter_members?.[0]?.role;
  const canUpload = ["owner", "editor"].includes(userRole);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link
            href={`/matters/${matterId}`}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {matter.title}
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Manage documents for this matter
        </p>
      </div>

      {/* Upload Section */}
      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Upload PDF, DOCX, or TXT files to this matter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUpload matterId={matterId} />
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>
            {documents?.length || 0} document
            {documents?.length !== 1 ? "s" : ""} in this matter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <DocumentList
              documents={documents}
              matterId={matterId}
              userRole={userRole}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No documents uploaded yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
