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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <Card
      variant="glass"
      className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50 rounded-none border-r border-l-0 border-t-0 border-b-0"
    >
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" strokeWidth={1.75} />
          <span className="text-xl font-semibold tracking-tight">Orderly</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col px-3 py-4">
        <ul role="list" className="flex flex-1 flex-col gap-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.name}>
                <Link href={item.href}>
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
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.name}>
                  <Link href={item.href}>
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
        </div>
      </nav>
    </Card>
  );
}



