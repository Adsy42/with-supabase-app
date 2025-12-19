"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderOpen,
  MessageSquare,
  Settings,
  LayoutDashboard,
  FileText,
  Scale,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Matters",
    href: "/matters",
    icon: FolderOpen,
  },
  {
    name: "Counsel",
    href: "/counsel",
    icon: MessageSquare,
  },
  {
    name: "Documents",
    href: "/documents",
    icon: FileText,
  },
];

const secondaryNavigation = [
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="relative z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-card border-r border-border">
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-border/50">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={onClose}
          >
            <Scale className="h-6 w-6 text-primary" strokeWidth={1.75} />
            <span className="text-xl font-semibold tracking-tight">
              Orderly
            </span>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" strokeWidth={1.75} />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        <nav className="flex flex-1 flex-col px-3 py-4">
          <ul role="list" className="flex flex-1 flex-col gap-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.name}>
                  <Link href={item.href} onClick={onClose}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        isActive && "bg-secondary/80"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                        strokeWidth={1.75}
                      />
                      <span
                        className={cn(
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {item.name}
                      </span>
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto pt-4 border-t border-border/50">
            <ul role="list" className="flex flex-col gap-1">
              {secondaryNavigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.name}>
                    <Link href={item.href} onClick={onClose}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3",
                          isActive && "bg-secondary/80"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                          strokeWidth={1.75}
                        />
                        <span
                          className={cn(
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {item.name}
                        </span>
                      </Button>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
