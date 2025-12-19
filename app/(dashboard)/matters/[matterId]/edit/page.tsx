import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MatterForm } from "@/components/matters/matter-form";
import { ArrowLeft } from "lucide-react";

interface EditMatterPageProps {
  params: Promise<{ matterId: string }>;
}

export default async function EditMatterPage({ params }: EditMatterPageProps) {
  const { matterId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Get matter with membership check (must be owner or editor)
  const { data: matter } = await supabase
    .from("matters")
    .select(
      `
      *,
      matter_members!inner(user_id, role)
    `
    )
    .eq("id", matterId)
    .eq("matter_members.user_id", user.id)
    .in("matter_members.role", ["owner", "editor"])
    .single();

  if (!matter) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/matters/${matterId}`}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Matter
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Matter</h1>
        <p className="text-muted-foreground">Update the matter details</p>
      </div>

      <MatterForm matter={matter} />
    </div>
  );
}
