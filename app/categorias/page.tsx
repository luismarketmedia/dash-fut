"use client";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/store/app";

function slugify(s: string) {
	return s
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export default function CategoriasPage() {
	const { state, dispatch } = useApp();
	const categories = state.categories;
	const { userId } = useAuth();
	const [counts, setCounts] = useState<
		Record<string, { players: number; teams: number; matches: number }>
	>({});

	// Fallback counts from in-memory state (covers no Supabase / not logged-in)
	const fallbackCounts = useMemo(() => {
		const map: Record<string, { players: number; teams: number; matches: number }> = {};
		for (const c of categories) map[c.id] = { players: 0, teams: 0, matches: 0 };
		for (const p of state.players) if (map[p.categoryId]) map[p.categoryId].players++;
		for (const t of state.teams) if (map[t.categoryId]) map[t.categoryId].teams++;
		for (const m of state.matches) if (map[m.categoryId]) map[m.categoryId].matches++;
		return map;
	}, [categories, state.players, state.teams, state.matches]);

	useEffect(() => {
		const hasSb =
			!!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
		const wsId = state.activeWorkspaceId;
		if (!hasSb || !userId || !wsId) {
			setCounts(fallbackCounts);
			return;
		}
		let cancelled = false;
		const load = async () => {
			const [players, teams, matches] = await Promise.all([
				supabase
					.from("players")
					.select("category_id")
					.eq("workspace_id", wsId)
					.then((r: any) => (r.data || []) as any[]),
				supabase
					.from("teams")
					.select("category_id")
					.eq("workspace_id", wsId)
					.then((r: any) => (r.data || []) as any[]),
				supabase
					.from("matches")
					.select("category_id")
					.eq("workspace_id", wsId)
					.then((r: any) => (r.data || []) as any[]),
			]);
			if (cancelled) return;
			const map: Record<string, { players: number; teams: number; matches: number }> = {};
			for (const c of categories) map[c.id] = { players: 0, teams: 0, matches: 0 };
			players.forEach((r: any) => {
				const id = r.category_id;
				if (map[id]) map[id].players++;
			});
			teams.forEach((r: any) => {
				const id = r.category_id;
				if (map[id]) map[id].teams++;
			});
			matches.forEach((r: any) => {
				const id = r.category_id;
				if (map[id]) map[id].matches++;
			});
			setCounts(map);
		};
		void load();
		return () => {
			cancelled = true;
		};
	}, [categories, userId, state.activeWorkspaceId, fallbackCounts]);

	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");

	const createCategory = async () => {
		const n = name.trim();
		if (!n) return;
		dispatch({ type: "ADD_CATEGORY", payload: { name: n } });
		setName("");
		setOpen(false);
	};

	return (
		<DashboardLayout>
			<div className="mb-8 flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
					<p className="text-muted-foreground">Listadas diretamente do banco de dados.</p>
				</div>
				<div>
					<Button onClick={() => setOpen(true)}>Nova categoria</Button>
				</div>
			</div>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Nova categoria</DialogTitle>
						<DialogDescription>Informe o nome da categoria.</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Input
							autoFocus
							placeholder="Ex.: Principal"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={createCategory} disabled={!name.trim()}>
							Criar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{categories.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Nenhuma categoria encontrada. Clique em "Nova categoria" para criar.
				</p>
			) : (
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{categories.map((c) => {
						const slug = slugify(c.name);
						const cts = counts[c.id] ||
							fallbackCounts[c.id] || { players: 0, teams: 0, matches: 0 };
						return (
							<Link prefetch={false} key={c.id} href={`/${slug}`} className="block">
								<Card className="transition-shadow hover:shadow-md">
									<CardHeader>
										<CardTitle className="flex items-center justify-between">
											<span>{c.name}</span>
											<Badge variant="secondary">{cts.teams} times</Badge>
										</CardTitle>
									</CardHeader>
									<CardContent className="text-sm text-muted-foreground">
										<div className="flex gap-4">
											<span>
												<span className="font-medium">{cts.players}</span> jogadores
											</span>
											<span>
												<span className="font-medium">{cts.matches}</span> partidas
											</span>
										</div>
									</CardContent>
								</Card>
							</Link>
						);
					})}
				</div>
			)}
		</DashboardLayout>
	);
}
