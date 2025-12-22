/**
 * Dashboard Index Page
 *
 * Redirects to the chat list page.
 */

import { redirect } from 'next/navigation';

export default function DashboardPage() {
  redirect('/dashboard/chat');
}

