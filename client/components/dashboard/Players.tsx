import { Pencil, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { type Player, type Position, useApp } from "@/store/app";

const POSITIONS: Position[] = [
	"SEM POSIÇÃO",
	"GOL",
	"FIXO",
	"MEIO",
	"ALA DIREITA",
	"ALA ESQUERDA",
	"FRENTE",
];

export function PlayersSection() {
	return (
		<section id="jogadores" className="space-y-6">
			<header className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold">Cadastro de Jogadores</h2>
					<p className="text-muted-foreground text-sm">Adicione, edite e gerencie os jogadores.</p>
				</div>
			</header>
			<div className="grid gap-6 md:grid-cols-3">
				<div className="md:col-span-1">
					<PlayerForm />
				</div>
				<div className="md:col-span-2">
					<PlayerTable />
				</div>
			</div>
		</section>
	);
}

function PlayerForm() {
	const { dispatch } = useApp();
	const [jerseyNumber, setJerseyNumber] = useState<number>(0);
	const [name, setName] = useState("");
	const [position, setPosition] = useState<Position>("SEM POSIÇÃO");
	const [paid, setPaid] = useState(false);

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		dispatch({
			type: "ADD_PLAYER",
			payload: {
				jerseyNumber: Number(jerseyNumber) || 0,
				name: name.trim(),
				position,
				paid,
			},
		});
		setJerseyNumber(0);
		setName("");
		setPosition("SEM POSIÇÃO");
		setPaid(false);
	};

	return (
		<form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
			<div className="grid gap-3">
				<label className="text-sm font-medium">Número da camisa</label>
				<Input
					type="number"
					min={0}
					value={jerseyNumber}
					onChange={(e) => {
						const n = parseInt(e.target.value || "0", 10);
						setJerseyNumber(Number.isFinite(n) ? n : 0);
					}}
				/>
			</div>
			<div className="grid gap-3">
				<label className="text-sm font-medium">Nome</label>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Ex.: João Silva"
				/>
			</div>
			<div className="grid gap-3">
				<label className="text-sm font-medium">Posição</label>
				<Select value={position} onValueChange={(v) => setPosition(v as Position)}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Selecione" />
					</SelectTrigger>
					<SelectContent>
						{POSITIONS.map((p) => (
							<SelectItem key={p} value={p}>
								{p}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex items-center gap-2">
				<Checkbox id="paid" checked={paid} onCheckedChange={(v) => setPaid(!!v)} />
				<label htmlFor="paid" className="text-sm">
					Pago
				</label>
			</div>
			<Button type="submit" className="w-full">
				Adicionar
			</Button>
		</form>
	);
}

function PlayerTable() {
	const { state, dispatch } = useApp();
	const loading = state.loading;
	const [query, setQuery] = useState("");
	const [pos, setPos] = useState<"ALL" | Position>("ALL");
	const [teamFilter, setTeamFilter] = useState<string>("ALL");

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const cat = state.activeCategoryId || state.categories[0]?.id || "";
		const base = state.players.filter((p) => p.categoryId === cat);
		const byText = !q
			? base
			: base.filter(
					(p) =>
						p.name.toLowerCase().includes(q) ||
						String(p.jerseyNumber).includes(q) ||
						p.position.toLowerCase().includes(q),
				);
		const byPos = pos === "ALL" ? byText : byText.filter((p) => p.position === pos);
		const teamIdOf = (pid: string) => {
			for (const [tid, ids] of Object.entries(state.assignments)) {
				if (ids.includes(pid)) return tid;
			}
			return "";
		};
		const byTeam =
			teamFilter === "ALL"
				? byPos
				: teamFilter === "NONE"
					? byPos.filter((p) => teamIdOf(p.id) === "")
					: byPos.filter((p) => teamIdOf(p.id) === teamFilter);
		return byTeam.slice().sort((a, b) => a.jerseyNumber - b.jerseyNumber);
	}, [
		state.players,
		state.assignments,
		query,
		pos,
		teamFilter,
		state.activeCategoryId,
		state.categories[0]?.id,
	]);

	return (
		<div className="rounded-lg border bg-card p-4 shadow-sm">
			<div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
					{loading ? (
						<Skeleton className="h-10 w-full sm:w-64" />
					) : (
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Buscar por nome, número ou posição"
							className="w-full sm:w-64"
						/>
					)}
					{loading ? (
						<Skeleton className="h-10 w-full sm:w-48" />
					) : (
						<Select value={pos} onValueChange={(v) => setPos(v as any)}>
							<SelectTrigger className="w-full sm:w-48">
								<SelectValue placeholder="Todas as posições" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">Todas as posições</SelectItem>
								{POSITIONS.map((p) => (
									<SelectItem key={p} value={p}>
										{p}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
					{loading ? (
						<Skeleton className="h-10 w-full sm:w-48" />
					) : (
						<Select value={teamFilter} onValueChange={(v) => setTeamFilter(v)}>
							<SelectTrigger className="w-full sm:w-48">
								<SelectValue placeholder="Todos os times" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">Todos os times</SelectItem>
								<SelectItem value="NONE">Sem time</SelectItem>
								{state.teams
									.filter(
										(t) =>
											(state.activeCategoryId || state.categories[0]?.id || "") === t.categoryId,
									)
									.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											{t.name}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					)}
				</div>
				<Badge variant="outline">
					Total:{" "}
					{state.loading
						? "--"
						: state.players.filter(
								(p) => p.categoryId === (state.activeCategoryId || state.categories[0]?.id || ""),
							).length}
				</Badge>
			</div>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>#</TableHead>
							<TableHead>Nome</TableHead>
							<TableHead className="hidden sm:table-cell">Posição</TableHead>
							<TableHead className="hidden sm:table-cell">Pago</TableHead>
							<TableHead className="hidden sm:table-cell">Time</TableHead>
							<TableHead className="w-20 text-right sm:w-24">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{state.loading ? (
							Array.from({ length: 8 }).map((_, i) => (
								<TableRow key={`sk-${i}`}>
									<TableCell>
										<Skeleton className="h-8 w-16" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-40" />
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										<Skeleton className="h-5 w-24" />
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										<Skeleton className="h-5 w-16" />
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										<Skeleton className="h-5 w-24" />
									</TableCell>
									<TableCell className="text-right">
										<Skeleton className="h-8 w-20 ml-auto" />
									</TableCell>
								</TableRow>
							))
						) : (
							<>
								{filtered.map((p) => (
									<PlayerRow
										key={p.id}
										player={p}
										onDelete={() => dispatch({ type: "DELETE_PLAYER", payload: { id: p.id } })}
									/>
								))}
								{filtered.length === 0 && (
									<TableRow>
										<TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
											Nenhum jogador
										</TableCell>
									</TableRow>
								)}
							</>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function PlayerRow({ player, onDelete }: { player: Player; onDelete: () => void }) {
	const { state, dispatch } = useApp();
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<Player>(player);
	const [jerseyEdit, setJerseyEdit] = useState<number>(player.jerseyNumber);
	const currentTeamId = useMemo(() => {
		for (const [tid, ids] of Object.entries(state.assignments)) {
			if (ids.includes(player.id)) return tid;
		}
		return "";
	}, [state.assignments, player.id]);
	const [teamEdit, setTeamEdit] = useState<string>(currentTeamId);

	// Keep inline state in sync if global changes
	useEffect(() => {
		setJerseyEdit(player.jerseyNumber);
		setForm(player);
	}, [player]);

	useEffect(() => {
		setTeamEdit(currentTeamId);
	}, [currentTeamId]);

	const commitJerseyIfChanged = () => {
		const newNumber = Number.isFinite(jerseyEdit) ? jerseyEdit : 0;
		if (newNumber !== player.jerseyNumber) {
			dispatch({
				type: "UPDATE_PLAYER",
				payload: { ...player, jerseyNumber: Math.max(0, newNumber) },
			});
		}
	};

	const togglePaid = (paid: boolean) => {
		if (paid !== player.paid) {
			dispatch({ type: "UPDATE_PLAYER", payload: { ...player, paid } });
		}
	};

	const onSave = () => {
		dispatch({ type: "UPDATE_PLAYER", payload: form });
		if (teamEdit !== currentTeamId) {
			const next: typeof state.assignments = Object.fromEntries(
				Object.entries(state.assignments).map(([k, v]) => [k, v.filter((id) => id !== player.id)]),
			);
			if (teamEdit) {
				const cap = state.teams.find((t) => t.id === teamEdit)?.capacity || Infinity;
				const cnt = next[teamEdit]?.length || 0;
				if (cnt < cap) (next[teamEdit] ||= []).push(player.id);
			}
			dispatch({ type: "SET_ASSIGNMENTS", payload: next });
		}
		setOpen(false);
	};

	return (
		<TableRow>
			<TableCell className="font-medium">
				<Input
					type="number"
					min={0}
					value={jerseyEdit}
					onChange={(e) => {
						const n = parseInt(e.target.value || "0", 10);
						setJerseyEdit(Number.isFinite(n) ? n : 0);
					}}
					onBlur={commitJerseyIfChanged}
					className="h-8 w-16 text-center sm:w-20"
				/>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<span className="truncate">{player.name}</span>
					<span className="sm:hidden">
						<Badge variant="secondary">{player.position}</Badge>
					</span>
				</div>
			</TableCell>
			<TableCell className="hidden sm:table-cell">
				<Badge variant="secondary">{player.position}</Badge>
			</TableCell>
			<TableCell className="hidden sm:table-cell">
				<div className="flex items-center gap-2">
					<Checkbox
						id={`paid-inline-${player.id}`}
						checked={player.paid}
						onCheckedChange={(v) => togglePaid(!!v)}
					/>
					<label htmlFor={`paid-inline-${player.id}`} className="text-xs">
						Pago
					</label>
				</div>
			</TableCell>
			<TableCell className="hidden sm:table-cell">
				{(() => {
					const teamId =
						Object.entries(state.assignments).find(([, ids]) => ids.includes(player.id))?.[0] || "";
					const name = teamId ? state.teams.find((t) => t.id === teamId)?.name || "-" : "-";
					return <span>{name}</span>;
				})()}
			</TableCell>
			<TableCell className="text-right">
				<div className="flex items-center justify-end gap-2">
					<Dialog open={open} onOpenChange={setOpen}>
						<DialogTrigger asChild>
							<Button size="icon" variant="ghost" className="h-8 w-8 sm:h-10 sm:w-10">
								<Pencil className="h-4 w-4" />
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Editar Jogador</DialogTitle>
							</DialogHeader>
							<div className="grid gap-3">
								<label className="text-sm">Número</label>
								<Input
									type="number"
									value={form.jerseyNumber}
									onChange={(e) => {
										const n = parseInt(e.target.value || "0", 10);
										setForm({ ...form, jerseyNumber: Number.isFinite(n) ? n : 0 });
									}}
								/>
								<label className="text-sm">Nome</label>
								<Input
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
								/>
								<label className="text-sm">Posição</label>
								<Select
									value={form.position}
									onValueChange={(v) => setForm({ ...form, position: v as Position })}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{POSITIONS.map((p) => (
											<SelectItem key={p} value={p}>
												{p}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<div className="flex items-center gap-2 pt-2">
									<Checkbox
										id={`paid-${player.id}`}
										checked={form.paid}
										onCheckedChange={(v) => setForm({ ...form, paid: !!v })}
									/>
									<label htmlFor={`paid-${player.id}`} className="text-sm">
										Pago
									</label>
								</div>
								<label className="text-sm">Time</label>
								{(() => {
									const NONE = "__NONE__";
									return (
										<Select
											value={teamEdit || NONE}
											onValueChange={(v) => setTeamEdit(v === NONE ? "" : v)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Sem time" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={NONE}>Sem time</SelectItem>
												{state.teams
													.filter(
														(t) =>
															(state.activeCategoryId || state.categories[0]?.id || "") ===
															t.categoryId,
													)
													.map((t) => (
														<SelectItem key={t.id} value={t.id}>
															{t.name} ({state.assignments[t.id]?.length || 0}/{t.capacity})
														</SelectItem>
													))}
											</SelectContent>
										</Select>
									);
								})()}
								<Button onClick={onSave}>Salvar</Button>
							</div>
						</DialogContent>
					</Dialog>
					<Button
						size="icon"
						variant="ghost"
						onClick={onDelete}
						className="h-8 w-8 sm:h-10 sm:w-10"
					>
						<Trash2 className="h-4 w-4 text-destructive" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

function _TeamSelectCell({ playerId }: { playerId: string }) {
	const { state, dispatch } = useApp();
	const cat = state.activeCategoryId || state.categories[0]?.id || "";
	const teams = state.teams.filter((t) => t.categoryId === cat);
	const assignments = state.assignments;
	const currentTeamId = useMemo(() => {
		for (const [tid, ids] of Object.entries(assignments)) {
			if (ids.includes(playerId)) return tid;
		}
		return "";
	}, [assignments, playerId]);

	const changeTeam = (tid: string) => {
		const next: typeof assignments = Object.fromEntries(
			Object.entries(assignments).map(([k, v]) => [k, v.filter((id) => id !== playerId)]),
		);
		if (tid) {
			const cap = teams.find((t) => t.id === tid)?.capacity || Infinity;
			const cnt = next[tid]?.length || 0;
			if (cnt >= cap) return; // evita exceder capacidade
			(next[tid] ||= []).push(playerId);
		}
		dispatch({ type: "SET_ASSIGNMENTS", payload: next });
	};

	const NONE = "__NONE__";
	return (
		<Select value={currentTeamId || NONE} onValueChange={(v) => changeTeam(v === NONE ? "" : v)}>
			<SelectTrigger>
				<SelectValue placeholder="Sem time" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={NONE}>Sem time</SelectItem>
				{teams.map((t) => (
					<SelectItem key={t.id} value={t.id}>
						{t.name} ({assignments[t.id]?.length || 0}/{t.capacity})
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
