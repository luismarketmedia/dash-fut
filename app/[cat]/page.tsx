"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/store/app";

function slugify(name: string) {
	return name
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export default function CategoryHomePage() {
	const { state, dispatch } = useApp();
	const params = useParams<{ cat: string }>();
	const catSlug = String(params.cat || "");
	const catId = useMemo(
		() => state.categories.find((c) => slugify(c.name) === catSlug)?.id || null,
		[state.categories, catSlug],
	);

	useEffect(() => {
		if (catId && state.activeCategoryId !== catId)
			dispatch({ type: "SET_ACTIVE_CATEGORY", payload: catId });
	}, [catId, state.activeCategoryId, dispatch]);

	const teams = state.teams.filter((t) => t.categoryId === (catId || ""));
	const players = state.players.filter((p) => p.categoryId === (catId || ""));
	const teamIdsSet = new Set(teams.map((t) => t.id));
	const assignedCount = Object.entries(state.assignments)
		.filter(([tid]) => teamIdsSet.has(tid))
		.reduce((a, [, list]) => a + (list?.length || 0), 0);
	const matches = state.matches.filter((m) => m.categoryId === (catId || ""));

	const base = `/${catSlug}`;

	return (
		<DashboardLayout>
			<div className="mb-8">
				<h1 className="text-2xl font-bold tracking-tight">
					Categoria: {state.categories.find((c) => c.id === catId)?.name || "-"}
				</h1>
				<p className="text-muted-foreground">Escolha uma seção para começar.</p>
			</div>
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<HomeTile
					to={`${base}/jogadores`}
					title="Jogadores"
					count={players.length}
					subtitle="Cadastrar e gerenciar"
				/>
				<HomeTile
					to={`${base}/times`}
					title="Times"
					count={teams.length}
					subtitle="Criar e editar"
				/>
				<HomeTile
					to={`${base}/sorteio`}
					title="Sorteio"
					count={assignedCount}
					subtitle="Distribuir jogadores"
				/>
				<HomeTile
					to={`${base}/fases`}
					title="Fases"
					count={matches.length}
					subtitle="Sorteio de confrontos"
				/>
			</div>
		</DashboardLayout>
	);
}

function HomeTile({
	to,
	title,
	count,
	subtitle,
}: {
	to: string;
	title: string;
	count: number;
	subtitle: string;
}) {
	return (
		<Link prefetch={false} href={to} className="block">
			<Card className="transition-shadow hover:shadow-md">
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>{title}</span>
						<Badge variant="secondary">{count}</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground">{subtitle}</CardContent>
			</Card>
		</Link>
	);
}
