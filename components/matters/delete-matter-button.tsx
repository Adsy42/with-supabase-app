"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteMatter } from "@/actions/matters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteMatterButtonProps {
  matterId: string;
}

export function DeleteMatterButton({ matterId }: DeleteMatterButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteMatter(matterId);
    // Redirect happens in the action
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Matter</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this matter? This action cannot be
            undone. All documents, conversations, and drafts associated with
            this matter will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Matter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



