import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DashboardLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md" style={{ background:
              "conic-gradient(from 45deg, hsl(var(--primary)), hsl(var(--accent)))" }} />
            <div className="text-lg font-semibold tracking-tight">Futebol Dashboard</div>
          </div>
          <nav className="hidden gap-2 sm:flex">
            <a href="#jogadores" className="text-sm text-muted-foreground hover:text-foreground">Jogadores</a>
            <a href="#times" className="text-sm text-muted-foreground hover:text-foreground">Times</a>
            <a href="#sorteio" className="text-sm text-muted-foreground hover:text-foreground">Sorteio</a>
            <a href="#fases" className="text-sm text-muted-foreground hover:text-foreground">Fases</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Topo</Button>
          </div>
        </div>
      </header>
      <main className="container py-8">
        {children}
      </main>
      <footer className="border-t py-6">
        <div className="container text-center text-xs text-muted-foreground">Organize seus jogos com facilidade</div>
      </footer>
    </div>
  );
}
