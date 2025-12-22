/**
 * Dashboard Layout
 *
 * Main layout for authenticated dashboard pages.
 * Includes sidebar navigation and responsive design.
 * 
 * Note: Authentication is handled by middleware (proxy.ts).
 * This layout assumes the user is already authenticated.
 */

import { Suspense } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar className="hidden md:flex" />
      </Suspense>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}

/**
 * Sidebar loading skeleton
 */
function SidebarSkeleton() {
  return (
    <div className="hidden w-64 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
      </div>
      <div className="p-4">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-1 px-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
