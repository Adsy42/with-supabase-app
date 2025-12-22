"use client";

/**
 * Dashboard Sidebar
 * Navigation sidebar for authenticated users
 * Following legal-tech-patterns.mdc design system
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MessageSquare, Settings, LogOut, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: MessageSquare, label: "Counsel", href: "/counsel" },
  { icon: Briefcase, label: "Matters", href: "/matters" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface DashboardSidebarProps {
  onSignOut?: () => void;
}

export function DashboardSidebar({ onSignOut }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/counsel" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
            <span className="text-lg font-bold text-white">O</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Orderly</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className="relative h-5 w-5" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={onSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}



