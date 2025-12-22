"use client";

/**
 * Matters Client Component
 * Handles matter list, creation, and management
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Briefcase,
  Search,
  Filter,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MatterCard } from "@/components/matters/matter-card";
import {
  listMatters,
  createMatter,
  archiveMatter,
  deleteMatter,
  type MatterListItem,
} from "@/actions/matters";

type StatusFilter = "active" | "archived" | "closed" | "all";

export function MattersClient() {
  const [matters, setMatters] = React.useState<MatterListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("active");
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    clientName: "",
    matterNumber: "",
  });

  // Load matters
  const loadMatters = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listMatters(statusFilter);
      if (result.success && result.data) {
        setMatters(result.data);
      }
    } catch (error) {
      console.error("Failed to load matters:", error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    loadMatters();
  }, [loadMatters]);

  // Filter matters by search
  const filteredMatters = React.useMemo(() => {
    if (!searchQuery) return matters;
    const query = searchQuery.toLowerCase();
    return matters.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.client_name?.toLowerCase().includes(query) ||
        m.matter_number?.toLowerCase().includes(query)
    );
  }, [matters, searchQuery]);

  // Handle create matter
  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    setIsCreating(true);
    try {
      const result = await createMatter(
        formData.name,
        formData.description || undefined,
        formData.clientName || undefined,
        formData.matterNumber || undefined
      );

      if (result.success) {
        setIsCreateOpen(false);
        setFormData({ name: "", description: "", clientName: "", matterNumber: "" });
        loadMatters();
      }
    } catch (error) {
      console.error("Failed to create matter:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle archive
  const handleArchive = async (matterId: string) => {
    try {
      const result = await archiveMatter(matterId);
      if (result.success) {
        loadMatters();
      }
    } catch (error) {
      console.error("Failed to archive matter:", error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      const result = await deleteMatter(deleteConfirmId);
      if (result.success) {
        loadMatters();
      }
    } catch (error) {
      console.error("Failed to delete matter:", error);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Matters</h1>
        <p className="text-muted-foreground mt-2">
          Organize your legal documents by matter. Select a matter in Counsel
          to scope your AI search to specific case documents.
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search matters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[130px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          {/* Create Button */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Matter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Matter</DialogTitle>
                <DialogDescription>
                  Create a new matter to organize your legal documents.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Matter Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Smith v. Jones"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    placeholder="e.g., ABC Corporation"
                    value={formData.clientName}
                    onChange={(e) =>
                      setFormData({ ...formData, clientName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matterNumber">Matter Number</Label>
                  <Input
                    id="matterNumber"
                    placeholder="e.g., 2024-001"
                    value={formData.matterNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, matterNumber: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of the matter..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formData.name.trim() || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-4 w-4 mr-2" />
                      Create Matter
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Matters List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMatters.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {searchQuery ? "No matters found" : "No matters yet"}
          </h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            {searchQuery
              ? "Try adjusting your search or filter."
              : "Create your first matter to start organizing your legal documents."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Matter
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredMatters.map((matter) => (
              <MatterCard
                key={matter.id}
                matter={matter}
                onArchive={handleArchive}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Matter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the matter and all its documents.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

