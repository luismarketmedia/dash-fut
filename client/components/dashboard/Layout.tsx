"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app";
import { CategorySelector } from "./CategorySelector";
import { WorkspaceManager } from "./WorkspaceManager";
import { WorkspaceSelector } from "./WorkspaceSelector";

export function DashboardLayout({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	const pathname = usePathname();
	const { state } = useApp();
	const linkClass = (href: string) =>
		pathname === href
			? "text-sm font-medium"
			: "text-sm text-muted-foreground hover:text-foreground";
	const slugify = (s: string) =>
		s
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");
	const categories = state.categories || [];
	const activeCat = categories.find(
		(c) => c.id === (state.activeCategoryId || categories[0]?.id || ""),
	);
	const base = activeCat ? `/${slugify(activeCat.name)}` : "";
	return (
		<div className={cn("min-h-screen bg-background text-foreground", className)}>
			{state.loading && (
				<>
					<div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />
					<div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" />
					<div className="fixed inset-0 z-50 flex items-center justify-center">
						<div className="flex flex-col items-center gap-3 rounded-md border bg-card px-6 py-4 shadow-lg">
							<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							<span className="text-sm text-muted-foreground">Carregando...</span>
						</div>
					</div>
				</>
			)}
			<header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-16 items-center justify-between">
					<div className="flex items-center gap-3">
						<Link prefetch={false} href="/" className="flex items-center gap-3">
							<span
								className="inline-flex h-8 w-8 items-center justify-center rounded-md"
								style={{
									background: "conic-gradient(from 45deg, hsl(var(--primary)), hsl(var(--accent)))",
								}}
							/>
							<div className="text-lg font-semibold tracking-tight">Futebol Dashboard</div>
						</Link>
					</div>
					<nav className="hidden items-center gap-3 sm:flex">
						<Link prefetch={false} href="/categorias" className={linkClass(`/categorias`)}>
							Categorias
						</Link>
						<WorkspaceManager variant="link" />
						<Link
							prefetch={false}
							href={`${base}/jogadores`}
							className={linkClass(`${base}/jogadores`)}
						>
							Jogadores
						</Link>
						<Link prefetch={false} href={`${base}/times`} className={linkClass(`${base}/times`)}>
							Times
						</Link>
						<Link
							prefetch={false}
							href={`${base}/sorteio`}
							className={linkClass(`${base}/sorteio`)}
						>
							Sorteio
						</Link>
						<Link prefetch={false} href={`${base}/fases`} className={linkClass(`${base}/fases`)}>
							Fases
						</Link>
					</nav>
					<div className="flex items-center gap-2">
						<div className="sm:hidden">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<Menu className="mr-2 h-4 w-4" /> Menu
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem>
										<Link prefetch={false} href="/categorias">
											Categorias
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Link prefetch={false} href={`${base}/jogadores`}>
											Jogadores
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Link prefetch={false} href={`${base}/times`}>
											Times
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Link prefetch={false} href={`${base}/sorteio`}>
											Sorteio
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Link prefetch={false} href={`${base}/fases`}>
											Fases
										</Link>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<SignedIn>
							<CategorySelector />
							<WorkspaceSelector />
							<UserButton afterSignOutUrl="/sign-in" />
						</SignedIn>
						<SignedOut>
							<Button size="sm" asChild>
								<Link prefetch={false} href="/sign-in">
									Entrar
								</Link>
							</Button>
						</SignedOut>
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
