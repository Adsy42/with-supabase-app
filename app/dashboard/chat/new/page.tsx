/**
 * New Chat Page
 *
 * Creates a new conversation and redirects to it.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function NewChatPage() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Create a new conversation
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: 'New Conversation',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create conversation:', error);
    // Redirect back to chat list with error
    redirect('/dashboard/chat?error=failed-to-create');
  }

  // Redirect to the new conversation
  redirect(`/dashboard/chat/${conversation.id}`);
}

