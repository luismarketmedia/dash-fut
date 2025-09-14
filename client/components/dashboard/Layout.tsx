"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";

export function DashboardLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const linkClass = (href: string) =>
    pathname === href
      ? "text-sm font-medium"
      : "text-sm text-muted-foreground hover:text-foreground";
  return (
    <div
      className={cn("min-h-screen bg-background text-foreground", className)}
    >
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-md"
              style={{
                background:
                  "conic-gradient(from 45deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            />
            <div className="text-lg font-semibold tracking-tight">
              Futebol Dashboard
            </div>
          </div>
          <nav className="hidden gap-3 sm:flex">
            <Link href="/jogadores" className={linkClass("/jogadores")}>
              Jogadores
            </Link>
            <Link href="/times" className={linkClass("/times")}>
              Times
            </Link>
            <Link href="/sorteio" className={linkClass("/sorteio")}>
              Sorteio
            </Link>
            <Link href="/fases" className={linkClass("/fases")}>
              Fases
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Topo
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
      <footer className="border-t py-6">
        <div className="container text-center text-xs text-muted-foreground">
          Organize seus jogos com facilidade
        </div>
      </footer>
    </div>
  );
}
