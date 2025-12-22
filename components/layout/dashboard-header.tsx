'use client';

/**
 * Dashboard Header Component
 *
 * Top header for dashboard pages with user menu and theme toggle.
 */

import { Suspense } from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { LogoutButton } from '@/components/logout-button';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({
  title,
  className,
  children,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between border-b border-border bg-card px-6',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        )}
        {children}
      </div>

      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <Suspense fallback={<div className="h-9 w-20" />}>
          <LogoutButton />
        </Suspense>
      </div>
    </header>
  );
}

