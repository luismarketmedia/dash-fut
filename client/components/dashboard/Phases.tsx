import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Select as UiSelect,
	SelectContent as UiSelectContent,
	SelectItem as UiSelectItem,
	SelectTrigger as UiSelectTrigger,
	SelectValue as UiSelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { type Phase, useApp } from "@/store/app";

const PHASES: Phase[] = ["Classificação", "Oitavas", "Quartas", "Semifinal", "Final"];

const MATCHES_PER_WEEK = 4;

export function PhasesSection() {
	const { state, dispatch, generateMatches, generateEliminationFromStandings } = useApp();
	const cat = state.activeCategoryId || state.categories[0]?.id || "";
	const teamsCat = state.teams.filter((t) => t.categoryId === cat);
	const [phase, setPhase] = useState<Phase>("Classificação");
	const [mounted, setMounted] = useState(false);

	// Evita divergências de hidratação para componentes client-only (Radix Select, Dialog)
	// Renderizamos os controles apenas após montar no cliente
	// Isso mantém o HTML idêntico ao do servidor durante a hidratação
	// sem placeholders nem conteúdo dinâmico.

	useEffect(() => {
		setMounted(true);
	}, []);

	const selectedTeamIds = useMemo(() => teamsCat.map((t) => t.id), [teamsCat]);

	const scopedMatches = useMemo(
		() => state.matches.filter((m) => m.categoryId === cat),
		[state.matches, cat],
	);
	const indexMap = useMemo(() => {
		const map = new Map<string, number>();
		scopedMatches.forEach((m, i) => map.set(m.id, i));
		return map;
	}, [scopedMatches]);

	const matchesByPhase = useMemo(() => {
		const groups: Record<Phase, typeof scopedMatches> = {
			Classificação: [],
			Oitavas: [],
			Quartas: [],
			Semifinal: [],
			Final: [],
		};
		for (const m of scopedMatches) groups[m.phase].push(m);
		for (const p of PHASES) groups[p].sort((a, b) => indexMap.get(a.id)! - indexMap.get(b.id)!);
		return groups;
	}, [scopedMatches, indexMap]);

	const packWeeks = (arr: typeof state.matches) => {
		const weeks: (typeof state.matches)[] = [];
		for (const m of arr) {
			const a = m.leftTeamId;
			const b = m.rightTeamId;
			let placed = false;
			for (const wk of weeks) {
				if (wk.length >= MATCHES_PER_WEEK) continue;
				const used = new Set<string>();
				wk.forEach((x) => {
					used.add(x.leftTeamId);
					used.add(x.rightTeamId);
				});
				if (!used.has(a) && !used.has(b)) {
					wk.push(m);
					placed = true;
					break;
				}
			}
			if (!placed) weeks.push([m]);
		}
		return weeks;
	};

	const scoreFor = (teamId: string, match: (typeof state.matches)[number]) => {
		const ids = state.assignments[teamId] || [];
		let s = 0;
		for (const pid of ids) {
			const ev = match.events[pid];
			if (ev) s += ev.goals;
		}
		return s;
	};

	return (
		<section id="fases" className="space-y-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold">Fases do Campeonato</h2>
					<p className="text-muted-foreground text-sm">
						Sorteie confrontos automáticos entre os times.
					</p>
				</div>
				<div className="flex items-center gap-2">
					{mounted && (
						<>
							<Select value={phase} onValueChange={(v) => setPhase(v as Phase)}>
								<SelectTrigger className="w-48">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PHASES.map((p) => (
										<SelectItem key={p} value={p}>
											{p}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive">Resetar fases</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Resetar fases?</AlertDialogTitle>
										<AlertDialogDescription>
											Esta ação vai apagar todos os jogos em "matches" (e seus eventos) do banco e
											limpar as fases atuais. Esta ação não pode ser desfeita.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancelar</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => {
												dispatch({ type: "CLEAR_MATCHES" });
											}}
										>
											Confirmar
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
							<Button
								onClick={() =>
									phase === "Classificação"
										? generateMatches(phase, selectedTeamIds)
										: generateEliminationFromStandings(phase as any)
								}
								disabled={teamsCat.length < 2}
							>
								Sortear confrontos
							</Button>
						</>
					)}
				</div>
			</header>

			{state.loading ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={`sk-phase-${i}`} className="overflow-hidden border-0 shadow-sm">
							<div className="border-b p-4">
								<Skeleton className="h-5 w-32" />
							</div>
							<CardContent className="p-4 space-y-3">
								{Array.from({ length: 3 }).map((__, j) => (
									<div
										key={`sk-line-${i}-${j}`}
										className="flex items-center justify-between gap-3 rounded-md border p-3"
									>
										<Skeleton className="h-5 w-40" />
										<Skeleton className="h-8 w-24" />
									</div>
								))}
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<div className="space-y-8">
					{PHASES.map((p) => {
						const matches = matchesByPhase[p];
						const renderWeeks = (wkArr: typeof state.matches) => {
							const weeks = packWeeks(wkArr);
							return (
								<div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
									{weeks.map((wk, idx) => (
										<Card
											key={`${p}-week-${idx + 1}`}
											className="overflow-hidden border-0 shadow-sm"
										>
											<div className="border-b p-4 flex items-center justify-between">
												<div className="font-semibold">Rodada {idx + 1}</div>
												<Badge variant="outline">{wk.length} jogos</Badge>
											</div>
											<CardContent className="p-4">
												<div className="space-y-3">
													{wk.map((m) => {
														const lt = state.teams.find((t) => t.id === m.leftTeamId);
														const rt = state.teams.find((t) => t.id === m.rightTeamId);
														if (!lt || !rt) return null;
														const ls = scoreFor(lt.id, m);
														const rs = scoreFor(rt.id, m);
														return (
															<div
																key={m.id}
																className="flex items-center justify-between gap-3 rounded-md border p-3"
															>
																<div className="flex items-center gap-2">
																	<span
																		className="font-medium truncate"
																		style={{ color: lt.color }}
																	>
																		{lt.name}
																	</span>
																	<span className="font-mono">
																		{ls} x {rs}
																	</span>
																	<span
																		className="font-medium truncate"
																		style={{ color: rt.color }}
																	>
																		{rt.name}
																	</span>
																</div>
																<div className="flex items-center gap-2">
																	<Link
																		href={`/jogo/${m.id}`}
																		className="text-primary underline whitespace-nowrap"
																	>
																		Abrir jogo
																	</Link>
																	<MatchEditDialog matchId={m.id} phase={p} />
																</div>
															</div>
														);
													})}
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							);
						};

						return (
							<div key={p}>
								<div className="mb-2 flex items-center justify-between">
									<h3 className="text-lg font-medium">{p}</h3>
									<Badge variant="secondary">{matches.length} jogos</Badge>
								</div>
								<Separator />
								{matches.length === 0 ? (
									<div className="py-6 text-sm text-muted-foreground">Nenhum confronto ainda.</div>
								) : p === "Classificação" && Object.keys(state.groups).length ? (
									<div className="space-y-8 mt-4">
										{(() => {
											const teamsSet = new Set(teamsCat.map((t) => t.id));
											const localGroups = Object.fromEntries(
												Object.entries(state.groups).filter(([tid]) => teamsSet.has(tid)),
											);
											return Array.from(new Set(Object.values(localGroups)))
												.sort()
												.map((label) => {
													const teamIds = new Set(
														Object.entries(localGroups)
															.filter(([, l]) => l === label)
															.map(([tid]) => tid),
													);
													const groupMatches = matches.filter(
														(m) => teamIds.has(m.leftTeamId) && teamIds.has(m.rightTeamId),
													);
													return (
														<div key={`chave-${label}`}>
															<div className="mb-2 flex items-center justify-between">
																<h4 className="font-semibold">Chave {label}</h4>
																<Badge variant="outline">{groupMatches.length} jogos</Badge>
															</div>
															{groupMatches.length === 0 ? (
																<div className="py-4 text-sm text-muted-foreground">
																	Nenhum confronto ainda.
																</div>
															) : (
																renderWeeks(groupMatches)
															)}
														</div>
													);
												});
										})()}
									</div>
								) : (
									renderWeeks(matches)
								)}
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}

function MatchEditDialog({ matchId, phase }: { matchId: string; phase: Phase }) {
	const { state, dispatch } = useApp();
	const match = state.matches.find((m) => m.id === matchId);
	const [open, setOpen] = useState(false);
	const [left, setLeft] = useState(match?.leftTeamId || "");
	const [right, setRight] = useState(match?.rightTeamId || "");

	const teams = state.teams;
	const groupLabel = (tid: string) => state.groups[tid];
	const allowed = (tid: string) => {
		if (phase !== "Classificação") return true;
		const gl = groupLabel(match?.leftTeamId || "") || groupLabel(match?.rightTeamId || "");
		return gl ? state.groups[tid] === gl : true;
	};

	useEffect(() => {
		setLeft(match?.leftTeamId || "");
		setRight(match?.rightTeamId || "");
	}, [match?.leftTeamId, match?.rightTeamId]);

	const canSave = left && right && left !== right;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					Editar
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Editar confronto</DialogTitle>
				</DialogHeader>
				<div className="grid gap-3">
					<label className="text-sm">Mandante</label>
					<UiSelect value={left} onValueChange={setLeft}>
						<UiSelectTrigger>
							<UiSelectValue />
						</UiSelectTrigger>
						<UiSelectContent>
							{teams
								.filter((t) => allowed(t.id))
								.map((t) => (
									<UiSelectItem key={t.id} value={t.id}>
										{t.name}
									</UiSelectItem>
								))}
						</UiSelectContent>
					</UiSelect>
					<label className="text-sm">Visitante</label>
					<UiSelect value={right} onValueChange={setRight}>
						<UiSelectTrigger>
							<UiSelectValue />
						</UiSelectTrigger>
						<UiSelectContent>
							{teams
								.filter((t) => allowed(t.id))
								.map((t) => (
									<UiSelectItem key={t.id} value={t.id}>
										{t.name}
									</UiSelectItem>
								))}
						</UiSelectContent>
					</UiSelect>
					<div className="flex items-center justify-end gap-2 pt-2">
						<Button variant="secondary" onClick={() => setOpen(false)}>
							Cancelar
						</Button>
						<Button
							disabled={!canSave}
							onClick={() => {
								if (!canSave) return;
								dispatch({
									type: "EDIT_MATCH_TEAMS",
									payload: { id: matchId, leftTeamId: left, rightTeamId: right },
								});
								setOpen(false);
							}}
						>
							Salvar
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
