"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { createMatter, updateMatter } from "@/actions/matters";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { Matter } from "@/types/database.types";

interface MatterFormProps {
  matter?: Matter;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="gradient" disabled={pending}>
      {pending
        ? isEdit
          ? "Saving..."
          : "Creating..."
        : isEdit
          ? "Save Changes"
          : "Create Matter"}
    </Button>
  );
}

export function MatterForm({ matter }: MatterFormProps) {
  const isEdit = !!matter;
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    
    const result = isEdit && matter
      ? await updateMatter(matter.id, formData)
      : await createMatter(formData);
    
    // If we get here without redirect, there was an error
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Matter" : "Matter Details"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Update the details of this matter"
            : "Enter the details for your new matter"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Matter Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Smith v Jones"
                defaultValue={matter?.title || ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="matter_number">Matter Number</Label>
              <Input
                id="matter_number"
                name="matter_number"
                placeholder="MAT-2024-001"
                defaultValue={matter?.matter_number || ""}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                name="client_name"
                placeholder="Acme Corporation"
                defaultValue={matter?.client_name || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="matter_type">Matter Type</Label>
              <Select
                name="matter_type"
                defaultValue={matter?.matter_type || undefined}
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
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={matter?.status || "active"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description of the matter..."
              rows={4}
              defaultValue={matter?.description || ""}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/matters">Cancel</Link>
            </Button>
            <SubmitButton isEdit={isEdit} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

