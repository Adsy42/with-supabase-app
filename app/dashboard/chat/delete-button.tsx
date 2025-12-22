'use client';

import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DeleteConversationButtonProps {
  conversationId: string;
}

export function DeleteConversationButton({ conversationId }: DeleteConversationButtonProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement delete functionality
    console.log('Delete conversation:', conversationId);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
    </Button>
  );
}

