"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createMatter, updateMatter } from "@/actions/matters";

interface Matter {
  id: string;
  title: string;
  client_name?: string | null;
  matter_type?: string | null;
  description?: string | null;
  matter_number?: string | null;
  status?: string | null;
}

interface MatterFormProps {
  matter?: Matter;
}

export function MatterForm({ matter }: MatterFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isEditing = !!matter;

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        const result = await updateMatter(matter.id, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/matters/${matter.id}`);
      } else {
        const result = await createMatter(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/matters/${result.data.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={matter?.title}
              placeholder="Enter matter title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name</Label>
            <Input
              id="client_name"
              name="client_name"
              defaultValue={matter?.client_name ?? ""}
              placeholder="Enter client name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matter_number">Matter Number</Label>
            <Input
              id="matter_number"
              name="matter_number"
              defaultValue={matter?.matter_number ?? ""}
              placeholder="e.g., 2024-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matter_type">Matter Type</Label>
            <Select
              name="matter_type"
              defaultValue={matter?.matter_type ?? undefined}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="litigation">Litigation</SelectItem>
                <SelectItem value="transaction">Transaction</SelectItem>
                <SelectItem value="advisory">Advisory</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                defaultValue={matter?.status ?? "active"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={matter?.description ?? ""}
              placeholder="Brief description of the matter"
              rows={4}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Matter"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
