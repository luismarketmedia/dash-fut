"use client";

import { useAuth } from "@clerk/nextjs";
import type React from "react";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { supabase } from "@/lib/supabase";

export type Position =
	| "SEM POSIÇÃO"
	| "GOL"
	| "FIXO"
	| "MEIO"
	| "ALA DIREITA"
	| "ALA ESQUERDA"
	| "FRENTE";

export interface Category {
	id: string;
	name: string;
}

export interface Player {
	id: string;
	jerseyNumber: number;
	name: string;
	position: Position;
	paid: boolean;
	categoryId: string;
}

export interface Team {
	id: string;
	name: string;
	color: string;
	capacity: number;
	categoryId: string;
}

export type Phase = "Classificação" | "Oitavas" | "Quartas" | "Semifinal" | "Final";

export interface PlayerStats {
	goals: number;
	yellow: number;
	red: boolean;
	destaque: boolean;
}

export interface Match {
	id: string;
	leftTeamId: string;
	rightTeamId: string;
	phase: Phase;
	startedAt?: number | null;
	half: 1 | 2;
	remainingMs: number;
	events: Record<string, PlayerStats>;
	categoryId: string;
}

export interface Assignments {
	[teamId: string]: string[];
}

export interface Workspace {
	id: string;
	name: string;
}

interface State {
	categories: Category[];
	activeCategoryId: string | null;
	players: Player[];
	teams: Team[];
	assignments: Assignments;
	matches: Match[];
	groups: Record<string, string>;
	loading: boolean;
	workspaces: Workspace[];
	activeWorkspaceId: string | null;
}

const initialState: State = {
	categories: [],
	activeCategoryId: null,
	players: [],
	teams: [],
	assignments: {},
	matches: [],
	groups: {},
	loading: false,
	workspaces: [],
	activeWorkspaceId: null,
};

const STORAGE_KEY = "futebol-dashboard-state-v2";

function loadState(): State {
	try {
		const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
		if (!raw) return initialState;
		const parsed = JSON.parse(raw) as State;
		if (!parsed.players || !parsed.teams || !parsed.matches || !parsed.assignments)
			return initialState;
		if (!parsed.categories) parsed.categories = [];
		if (!parsed.activeCategoryId) parsed.activeCategoryId = parsed.categories[0]?.id || null;
		if (!(parsed as any).workspaces) (parsed as any).workspaces = [];
		if (!(parsed as any).activeWorkspaceId) (parsed as any).activeWorkspaceId = null;
		return parsed as State;
	} catch {
		return initialState;
	}
}

function saveState(state: State) {
	if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Actions

type Action =
	| { type: "HYDRATE"; payload: State }
	| { type: "SET_ACTIVE_CATEGORY"; payload: string }
	| { type: "ADD_CATEGORY"; payload: { name: string; id?: string } }
	| { type: "RENAME_CATEGORY"; payload: { id: string; name: string } }
	| { type: "DELETE_CATEGORY"; payload: { id: string } }
	| { type: "ADD_PLAYER"; payload: Omit<Player, "id" | "categoryId"> | Player }
	| { type: "UPDATE_PLAYER"; payload: Player }
	| { type: "DELETE_PLAYER"; payload: { id: string } }
	| { type: "ADD_TEAM"; payload: Omit<Team, "id" | "categoryId"> | Team }
	| { type: "UPDATE_TEAM"; payload: Team }
	| { type: "DELETE_TEAM"; payload: { id: string } }
	| { type: "SET_ASSIGNMENTS"; payload: Assignments }
	| { type: "ADD_MATCHES"; payload: Match[] }
	| { type: "UPDATE_MATCH"; payload: Match }
	| { type: "DELETE_MATCH"; payload: { id: string } }
	| { type: "EDIT_MATCH_TEAMS"; payload: { id: string; leftTeamId: string; rightTeamId: string } }
	| { type: "CLEAR_MATCHES" }
	| { type: "SET_GROUPS"; payload: Record<string, string> }
	| { type: "RESET_TEAMS_AND_PHASES" }
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "RESET_ALL" }
	| { type: "SET_ACTIVE_WORKSPACE"; payload: string }
	| { type: "SET_WORKSPACES"; payload: Workspace[] };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "HYDRATE":
			return action.payload;
		case "SET_ACTIVE_CATEGORY":
			return { ...state, activeCategoryId: action.payload };
		case "ADD_CATEGORY": {
			const c: Category = {
				id: (action.payload as any).id || crypto.randomUUID(),
				name: action.payload.name,
			};
			return {
				...state,
				categories: [...state.categories, c],
				activeCategoryId: state.activeCategoryId || c.id,
			};
		}
		case "RENAME_CATEGORY": {
			return {
				...state,
				categories: state.categories.map((c) =>
					c.id === action.payload.id ? { ...c, name: action.payload.name } : c,
				),
			};
		}
		case "DELETE_CATEGORY": {
			const categories = state.categories.filter((c) => c.id !== action.payload.id);
			const activeCategoryId =
				state.activeCategoryId === action.payload.id
					? categories[0]?.id || null
					: state.activeCategoryId;
			const players = state.players.filter((p) => p.categoryId !== action.payload.id);
			const teams = state.teams.filter((t) => t.categoryId !== action.payload.id);
			const removedTeamIds = new Set(
				state.teams.filter((t) => t.categoryId === action.payload.id).map((t) => t.id),
			);
			const assignments = Object.fromEntries(
				Object.entries(state.assignments).filter(([tid]) => !removedTeamIds.has(tid)),
			);
			const matches = state.matches.filter((m) => m.categoryId !== action.payload.id);
			const groups = Object.fromEntries(
				Object.entries(state.groups).filter(([tid]) => !removedTeamIds.has(tid)),
			);
			return {
				...state,
				categories,
				activeCategoryId,
				players,
				teams,
				assignments,
				matches,
				groups,
			};
		}
		case "ADD_PLAYER": {
			const payload = action.payload as any;
			const withId: Player = "id" in payload ? payload : { id: crypto.randomUUID(), ...payload };
			const player: Player = {
				...withId,
				categoryId: (withId.categoryId || state.activeCategoryId || state.categories[0]?.id)!,
			};
			return { ...state, players: [...state.players, player] };
		}
		case "UPDATE_PLAYER": {
			return {
				...state,
				players: state.players.map((p) => (p.id === action.payload.id ? action.payload : p)),
			};
		}
		case "DELETE_PLAYER": {
			const assignments: Assignments = Object.fromEntries(
				Object.entries(state.assignments).map(([tid, list]) => [
					tid,
					list.filter((pid) => pid !== action.payload.id),
				]),
			);
			return {
				...state,
				players: state.players.filter((p) => p.id !== action.payload.id),
				assignments,
			};
		}
		case "ADD_TEAM": {
			const payload = action.payload as any;
			const withId: Team = "id" in payload ? payload : { id: crypto.randomUUID(), ...payload };
			const team: Team = {
				...withId,
				categoryId: (withId.categoryId || state.activeCategoryId || state.categories[0]?.id)!,
			};
			return {
				...state,
				teams: [...state.teams, team],
				assignments: { ...state.assignments, [team.id]: [] },
			};
		}
		case "UPDATE_TEAM": {
			return {
				...state,
				teams: state.teams.map((t) => (t.id === action.payload.id ? action.payload : t)),
			};
		}
		case "DELETE_TEAM": {
			const { [action.payload.id]: _removed, ...rest } = state.assignments;
			return {
				...state,
				teams: state.teams.filter((t) => t.id !== action.payload.id),
				assignments: rest,
			};
		}
		case "SET_ASSIGNMENTS":
			return { ...state, assignments: action.payload };
		case "ADD_MATCHES":
			return { ...state, matches: [...state.matches, ...action.payload] };
		case "UPDATE_MATCH":
			return {
				...state,
				matches: state.matches.map((m) => (m.id === action.payload.id ? action.payload : m)),
			};
		case "DELETE_MATCH":
			return { ...state, matches: state.matches.filter((m) => m.id !== action.payload.id) };
		case "EDIT_MATCH_TEAMS": {
			const DEFAULT_MS = 20 * 60 * 1000;
			return {
				...state,
				matches: state.matches.map((m) =>
					m.id === action.payload.id
						? {
								...m,
								leftTeamId: action.payload.leftTeamId,
								rightTeamId: action.payload.rightTeamId,
								startedAt: null,
								half: 1,
								remainingMs: DEFAULT_MS,
								events: {},
							}
						: m,
				),
			};
		}
		case "CLEAR_MATCHES":
			return { ...state, matches: [] };
		case "SET_GROUPS":
			return { ...state, groups: action.payload };
		case "RESET_TEAMS_AND_PHASES":
			return { ...state, assignments: {}, matches: [], groups: {} };
		case "SET_LOADING":
			return { ...state, loading: action.payload };
		case "SET_WORKSPACES":
			return {
				...state,
				workspaces: action.payload,
				activeWorkspaceId: state.activeWorkspaceId || action.payload[0]?.id || null,
			};
		case "SET_ACTIVE_WORKSPACE":
			return { ...state, activeWorkspaceId: action.payload };
		case "RESET_ALL":
			return initialState;
		default:
			return state;
	}
}

const AppContext = createContext<{
	state: State;
	dispatch: React.Dispatch<Action>;
	drawTeams: (paidOnly?: boolean) => void;
	generateMatches: (phase: Phase, teamIds: string[]) => void;
	generateEliminationFromStandings: (phase: Exclude<Phase, "Classificação">) => void;
	resetDrawAndPhases: () => void;
	updatePlayerStat: (
		matchId: string,
		playerId: string,
		updater: (prev: PlayerStats) => PlayerStats,
	) => void;
	setUniqueDestaque: (matchId: string, playerId: string) => void;
	startPauseTimer: (matchId: string) => void;
	resetTimer: (matchId: string) => void;
	nextHalf: (matchId: string) => void;
} | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [state, baseDispatch] = useReducer(reducer, initialState);

	const hydratedRef = useRef(false);
	useEffect(() => {
		const ls = loadState();
		baseDispatch({ type: "HYDRATE", payload: ls });
		hydratedRef.current = true;
	}, []);

	useEffect(() => {
		if (!hydratedRef.current) return;
		saveState(state);
	}, [state]);

	const { userId } = useAuth();
	const lastLoadKeyRef = useRef<string | null>(null);
	const currentReqIdRef = useRef(0);

	useEffect(() => {
		const joinIfInvited = async () => {
			if (!userId) return;
			if (typeof window === "undefined") return;
			const url = new URL(window.location.href);
			const join = url.searchParams.get("joinWorkspace");
			if (!join) return;
			try {
				await supabase
					.from("workspace_members")
					.upsert(
						{ workspace_id: join, user_id: userId, role: "member" },
						{ onConflict: "workspace_id,user_id" },
					)
					.throwOnError();
				const { data: ws } = await supabase
					.from("workspaces")
					.select("id,name")
					.eq("id", join)
					.single();
				if (ws) {
					const exists = state.workspaces.some((w) => w.id === ws.id);
					baseDispatch({
						type: "SET_WORKSPACES",
						payload: exists
							? state.workspaces
							: [...state.workspaces, { id: ws.id as string, name: ws.name as string }],
					});
					baseDispatch({ type: "SET_ACTIVE_WORKSPACE", payload: ws.id as string });
				}
			} finally {
				url.searchParams.delete("joinWorkspace");
				window.history.replaceState({}, document.title, url.toString());
			}
		};
		void joinIfInvited();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId]);

	useEffect(() => {
		const load = async () => {
			const hasSb =
				!!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
			if (!hasSb || !userId) return;

			// Workspaces for current user
			let wsId = state.activeWorkspaceId;
			let workspaces = state.workspaces;
			if (!wsId || workspaces.length === 0) {
				const { data: mems } = await supabase
					.from("workspace_members")
					.select("workspace_id, workspaces ( id, name )")
					.eq("user_id", userId);
				let list = (mems || [])
					.map((m: any) =>
						m.workspaces
							? { id: m.workspaces.id as string, name: m.workspaces.name as string }
							: null,
					)
					.filter(Boolean) as { id: string; name: string }[];

				if (!list.length) {
					const { data: ws, error: e1 } = await supabase
						.from("workspaces")
						.insert({ name: "Pessoal", created_by: userId })
						.select("id, name")
						.single();
					if (!e1 && ws) {
						await supabase
							.from("workspace_members")
							.insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
						await Promise.all([
							supabase
								.from("categories")
								.update({ workspace_id: ws.id })
								.eq("owner_id", userId)
								.is("workspace_id", null),
							supabase
								.from("players")
								.update({ workspace_id: ws.id })
								.eq("owner_id", userId)
								.is("workspace_id", null),
							supabase
								.from("teams")
								.update({ workspace_id: ws.id })
								.eq("owner_id", userId)
								.is("workspace_id", null),
							supabase
								.from("matches")
								.update({ workspace_id: ws.id })
								.eq("owner_id", userId)
								.is("workspace_id", null),
							supabase
								.from("assignments")
								.update({ workspace_id: ws.id })
								.eq("owner_id", userId)
								.is("workspace_id", null),
							supabase
								.from("match_events")
								.update({ workspace_id: ws.id })
								.eq("owner_id", userId)
								.is("workspace_id", null),
						]);
						list = [{ id: ws.id as string, name: ws.name as string }];
					}
				}

				workspaces = list;
				wsId = wsId || list[0]?.id || null;
				if (list.length) baseDispatch({ type: "SET_WORKSPACES", payload: list as any });
				if (wsId) baseDispatch({ type: "SET_ACTIVE_WORKSPACE", payload: wsId });
			}

			// Avoid starting the same request multiple times for the same user/workspace/category
			const cat = state.activeCategoryId || state.categories[0]?.id || null;
			const loadKey = `${userId}::${wsId || "__NO_WS__"}::${cat || "__NO_CAT__"}`;
			const lastKey = lastLoadKeyRef.current || undefined;
			if (lastKey === loadKey) {
				console.log("[App] load skip (same key)", { loadKey });
				return;
			}
			lastLoadKeyRef.current = loadKey;
			console.log("[App] load start", { loadKey, wsId, cat });

			baseDispatch({ type: "SET_LOADING", payload: true });

			// Stale-while-revalidate guard across concurrent loads
			const reqId = ++currentReqIdRef.current;
			console.log("[App] fetch bundle", { reqId, wsId, cat });
			try {
				const [
					{ data: categories },
					{ data: players },
					{ data: teams },
					{ data: assignments },
					{ data: matches },
					{ data: events },
				] = await Promise.all([
					wsId
						? supabase
								.from("categories")
								.select("id, name")
								.eq("workspace_id", wsId)
								.then((r) => ({ data: (r.data || []) as any }))
						: Promise.resolve({ data: [] }),
					cat && wsId
						? supabase
								.from("players")
								.select("id, jersey_number, name, position, paid, category_id")
								.eq("workspace_id", wsId)
								.eq("category_id", cat)
								.then((r) => ({
									data: (r.data || []).map((p: any) => ({
										id: p.id,
										jerseyNumber: p.jersey_number,
										name: p.name,
										position: p.position,
										paid: p.paid,
										category_id: p.category_id,
									})),
								}))
						: Promise.resolve({ data: [] }),
					cat && wsId
						? supabase
								.from("teams")
								.select("id, name, color, capacity, category_id")
								.eq("workspace_id", wsId)
								.eq("category_id", cat)
								.then((r) => ({ data: (r.data || []) as any }))
						: Promise.resolve({ data: [] }),
					cat && wsId
						? supabase
								.from("assignments")
								.select("team_id, player_id")
								.eq("workspace_id", wsId)
								.eq("category_id", cat)
								.then((r) => ({ data: (r.data || []) as any }))
						: Promise.resolve({ data: [] }),
					cat && wsId
						? supabase
								.from("matches")
								.select(
									"id, left_team_id, right_team_id, phase, started_at, half, remaining_ms, category_id",
								)
								.eq("workspace_id", wsId)
								.eq("category_id", cat)
								.then((r) => ({ data: (r.data || []) as any }))
						: Promise.resolve({ data: [] }),
					cat && wsId
						? supabase
								.from("match_events")
								.select("match_id, player_id, goals, yellow, red, destaque")
								.eq("workspace_id", wsId)
								.eq("category_id", cat)
								.then((r) => ({ data: (r.data || []) as any }))
						: Promise.resolve({ data: [] }),
				]);

				// Ignore stale responses (a newer load started)
				if (reqId !== currentReqIdRef.current) {
					console.log("[App] load ignore stale", { reqId, current: currentReqIdRef.current });
					return;
				}

				const nextCategories: Category[] = (categories || []).map((c: any) => ({
					id: c.id,
					name: c.name,
				}));
				const nextActive =
					cat && nextCategories.some((c) => c.id === cat) ? cat : nextCategories[0]?.id || null;
				const latestCat = state.activeCategoryId || state.categories[0]?.id || null;
				const activeToApply =
					latestCat && nextCategories.some((c) => c.id === latestCat) ? latestCat : nextActive;

				const assignMap: Assignments = {};
				(teams || []).forEach((t: any) => (assignMap[t.id] = []));
				(assignments || []).forEach((a: any) => {
					if (!assignMap[a.team_id]) assignMap[a.team_id] = [];
					assignMap[a.team_id].push(a.player_id);
				});

				const eventsByMatch: Record<string, Record<string, PlayerStats>> = {};
				(events || []).forEach((e: any) => {
					if (!eventsByMatch[e.match_id]) eventsByMatch[e.match_id] = {};
					eventsByMatch[e.match_id][e.player_id] = {
						goals: e.goals || 0,
						yellow: e.yellow || 0,
						red: !!e.red,
						destaque: !!e.destaque,
					};
				});

				const matchesNorm: Match[] = (matches || []).map((m: any) => ({
					id: m.id,
					leftTeamId: m.left_team_id,
					rightTeamId: m.right_team_id,
					phase: m.phase,
					half: (m.half || 1) as 1 | 2,
					remainingMs: m.remaining_ms ?? 20 * 60 * 1000,
					startedAt: m.started_at ? new Date(m.started_at).getTime() : null,
					events: eventsByMatch[m.id] || {},
					categoryId: m.category_id,
				}));

				const teamsNorm: Team[] = (teams || []).map((t: any) => ({
					id: t.id,
					name: t.name,
					color: t.color,
					capacity: t.capacity,
					categoryId: t.category_id,
				}));

				const playersNorm: Player[] = (players || []).map((p: any) => ({
					id: p.id,
					jerseyNumber: p.jersey_number,
					name: p.name,
					position: p.position,
					paid: p.paid,
					categoryId: p.category_id,
				}));

				baseDispatch({
					type: "HYDRATE",
					payload: {
						categories: nextCategories,
						activeCategoryId: activeToApply,
						players: playersNorm as Player[],
						teams: teamsNorm,
						assignments: assignMap,
						matches: matchesNorm,
						groups: {},
						loading: false,
						workspaces: workspaces || [],
						activeWorkspaceId: wsId || null,
					} as any,
				});
				console.log("[App] hydrate", {
					applyActive: activeToApply,
					counts: {
						categories: nextCategories.length,
						players: playersNorm.length,
						teams: teamsNorm.length,
						matches: matchesNorm.length,
					},
				});
				hydratedRef.current = true;
			} finally {
				baseDispatch({ type: "SET_LOADING", payload: false });
				console.log("[App] load finished", { loadKey: lastLoadKeyRef.current });
			}
		};
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, state.activeCategoryId, state.activeWorkspaceId]);

	const dispatch = (action: Action) => {
		let transformed: Action = action;
		if (action.type === "SET_ACTIVE_CATEGORY") {
			console.log("[App] dispatch SET_ACTIVE_CATEGORY", {
				prev: state.activeCategoryId,
				next: (action as any).payload,
			});
			if (action.payload === state.activeCategoryId) {
				console.log("[App] ignore redundant category change");
				return; // avoid redundant updates that can retrigger effects
			}
		}
		if (action.type === "ADD_PLAYER" && !("id" in (action.payload as any))) {
			transformed = {
				type: "ADD_PLAYER",
				payload: { id: crypto.randomUUID(), ...(action.payload as any) } as any,
			} as Action;
		}
		if (action.type === "ADD_TEAM" && !("id" in (action.payload as any))) {
			transformed = {
				type: "ADD_TEAM",
				payload: { id: crypto.randomUUID(), ...(action.payload as any) } as any,
			} as Action;
		}
		if (action.type === "ADD_CATEGORY" && !("id" in (action.payload as any))) {
			transformed = {
				type: "ADD_CATEGORY",
				payload: { id: crypto.randomUUID(), ...(action.payload as any) } as any,
			} as Action;
		}
		baseDispatch(transformed);
		if (
			(transformed.type === "SET_ACTIVE_CATEGORY" || transformed.type === "SET_ACTIVE_WORKSPACE") &&
			process.env.NEXT_PUBLIC_SUPABASE_URL &&
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
			userId
		) {
			baseDispatch({ type: "SET_LOADING", payload: true });
		}
		void persistAction(transformed);
	};

	async function persistAction(action: Action) {
		try {
			if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
				return;
			if (!userId) return;
			const cat = state.activeCategoryId || state.categories[0]?.id || null;
			const wsId = state.activeWorkspaceId || null;
			switch (action.type) {
				case "ADD_CATEGORY": {
					await supabase
						.from("categories")
						.insert({
							id: (action as any).payload?.id || undefined,
							name: (action as any).payload.name,
							owner_id: userId,
							workspace_id: wsId,
						})
						.throwOnError();
					break;
				}
				case "RENAME_CATEGORY": {
					await supabase
						.from("categories")
						.update({ name: (action as any).payload.name })
						.eq("id", (action as any).payload.id)
						.throwOnError();
					break;
				}
				case "DELETE_CATEGORY": {
					await supabase
						.from("categories")
						.delete()
						.eq("id", (action as any).payload.id)
						.throwOnError();
					break;
				}
				case "ADD_PLAYER": {
					const p = action.payload as Player | Omit<Player, "id" | "categoryId">;
					const payload = (p as any).id
						? {
								id: (p as any).id,
								jersey_number: (p as any).jerseyNumber,
								name: (p as any).name,
								position: (p as any).position,
								paid: (p as any).paid,
								owner_id: userId,
								category_id: cat,
								workspace_id: wsId,
							}
						: {
								jersey_number: (p as any).jerseyNumber,
								name: (p as any).name,
								position: (p as any).position,
								paid: (p as any).paid,
								owner_id: userId,
								category_id: cat,
								workspace_id: wsId,
							};
					await supabase.from("players").insert(payload).throwOnError();
					break;
				}
				case "UPDATE_PLAYER": {
					await supabase
						.from("players")
						.update({
							jersey_number: action.payload.jerseyNumber,
							name: action.payload.name,
							position: action.payload.position,
							paid: action.payload.paid,
						})
						.eq("id", action.payload.id)
						.throwOnError();
					break;
				}
				case "DELETE_PLAYER": {
					await supabase.from("players").delete().eq("id", action.payload.id).throwOnError();
					break;
				}
				case "ADD_TEAM": {
					const t = action.payload as Team | Omit<Team, "id" | "categoryId">;
					const payload = (t as any).id
						? {
								id: (t as any).id,
								name: (t as any).name,
								color: (t as any).color,
								capacity: (t as any).capacity,
								owner_id: userId,
								category_id: cat,
								workspace_id: wsId,
							}
						: {
								name: (t as any).name,
								color: (t as any).color,
								capacity: (t as any).capacity,
								owner_id: userId,
								category_id: cat,
								workspace_id: wsId,
							};
					await supabase.from("teams").insert(payload).throwOnError();
					break;
				}
				case "UPDATE_TEAM": {
					await supabase
						.from("teams")
						.update({
							name: action.payload.name,
							color: action.payload.color,
							capacity: action.payload.capacity,
						})
						.eq("id", action.payload.id)
						.throwOnError();
					break;
				}
				case "DELETE_TEAM": {
					await supabase.from("teams").delete().eq("id", action.payload.id).throwOnError();
					break;
				}
				case "SET_ASSIGNMENTS": {
					if (!cat) break;
					const rows: {
						team_id: string;
						player_id: string;
						owner_id: string;
						category_id: string;
						workspace_id: string | null;
					}[] = [];
					for (const [team_id, list] of Object.entries(action.payload))
						for (const player_id of list)
							rows.push({
								team_id,
								player_id,
								owner_id: userId,
								category_id: cat!,
								workspace_id: wsId,
							});
					if (wsId)
						await supabase
							.from("assignments")
							.delete()
							.eq("workspace_id", wsId)
							.eq("category_id", cat)
							.throwOnError();
					else
						await supabase
							.from("assignments")
							.delete()
							.eq("owner_id", userId)
							.eq("category_id", cat)
							.throwOnError();
					if (rows.length) await supabase.from("assignments").insert(rows).throwOnError();
					break;
				}
				case "ADD_MATCHES": {
					if (!action.payload.length || !cat) break;
					const rows = action.payload.map((m) => ({
						id: m.id,
						left_team_id: m.leftTeamId,
						right_team_id: m.rightTeamId,
						phase: m.phase,
						started_at: m.startedAt ? new Date(m.startedAt).toISOString() : null,
						half: m.half,
						remaining_ms: m.remainingMs,
						owner_id: userId,
						category_id: cat,
						workspace_id: wsId,
					}));
					await supabase.from("matches").insert(rows).throwOnError();
					break;
				}
				case "DELETE_MATCH": {
					await Promise.all([
						supabase.from("match_events").delete().eq("match_id", action.payload.id).throwOnError(),
						supabase.from("matches").delete().eq("id", action.payload.id).throwOnError(),
					]);
					break;
				}
				case "EDIT_MATCH_TEAMS": {
					const DEFAULT_MS = 20 * 60 * 1000;
					await Promise.all([
						supabase
							.from("matches")
							.update({
								left_team_id: action.payload.leftTeamId,
								right_team_id: action.payload.rightTeamId,
								started_at: null,
								half: 1,
								remaining_ms: DEFAULT_MS,
							})
							.eq("id", action.payload.id)
							.throwOnError(),
						supabase.from("match_events").delete().eq("match_id", action.payload.id).throwOnError(),
					]);
					break;
				}
				case "CLEAR_MATCHES": {
					if (!cat) break;
					await Promise.all([
						supabase.from("match_events").delete().eq("category_id", cat).throwOnError(),
						supabase.from("matches").delete().eq("category_id", cat).throwOnError(),
					]);
					break;
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	// Timer tick
	useEffect(() => {
		const id = setInterval(() => {
			const now = Date.now();
			const running = state.matches.filter((m) => m.startedAt);
			if (running.length === 0) return;
			running.forEach((m) => {
				const elapsed = now - (m.startedAt || 0);
				const newRemaining = Math.max(0, m.remainingMs - elapsed);
				const updated: Match = { ...m, remainingMs: newRemaining, startedAt: now };
				if (newRemaining === 0) updated.startedAt = null;
				baseDispatch({ type: "UPDATE_MATCH", payload: updated });
			});
		}, 1000);
		return () => clearInterval(id);
	}, [state.matches]);

	const drawTeams = (paidOnly?: boolean) => {
		const cat = state.activeCategoryId || state.categories[0]?.id || "";
		const teams = state.teams.filter((t) => t.categoryId === cat);
		const allPlayers = (paidOnly ? state.players.filter((p) => p.paid) : state.players).filter(
			(p) => p.categoryId === cat,
		);
		if (teams.length === 0) return;

		const result: Assignments = Object.fromEntries(teams.map((t) => [t.id, [] as string[]]));
		const used = new Set<string>();

		const basePositions: Position[] = [
      "SEM POSIÇÃO",
      "GOL",
			"FIXO",
			"MEIO",
			"ALA DIREITA",
			"ALA ESQUERDA",
			"FRENTE",
		];

		const byPos: Record<Position, Player[]> = {
      "SEM POSIÇÃO": [],
      GOL: [],
			FIXO: [],
			MEIO: [],
			"ALA DIREITA": [],
			"ALA ESQUERDA": [],
			FRENTE: []
    };
		for (const p of allPlayers) (byPos[p.position] ||= []).push(p);
		for (const pos of basePositions) byPos[pos] = shuffle(byPos[pos] || []);

		const posPtr: Record<Position, number> = {
      "SEM POSIÇÃO": 0,
      GOL: 0,
			FIXO: 0,
			MEIO: 0,
			"ALA DIREITA": 0,
			"ALA ESQUERDA": 0,
			FRENTE: 0,
		};

		const targetPerTeam: Record<string, number> = {};
		for (const t of teams) targetPerTeam[t.id] = Math.min(t.capacity, basePositions.length + 2);

		basePositions.forEach((pos, posIndex) => {
			const pool = byPos[pos];
			let i = posPtr[pos];
			for (let j = 0; j < teams.length; j++) {
				const team = teams[(j + posIndex) % teams.length]!;
				if ((result[team.id]?.length || 0) >= targetPerTeam[team.id]) continue;
				while (i < pool.length && used.has(pool[i]!.id)) i++;
				if (i >= pool.length) break;
				const player = pool[i]!;
				result[team.id].push(player.id);
				used.add(player.id);
				i++;
			}
			posPtr[pos] = i;
		});

		const reservesPool = shuffle(allPlayers.filter((p) => p.position !== "GOL" && !used.has(p.id)));
		let ti = 0;
		for (const p of reservesPool) {
			let attempts = 0;
			while (attempts < teams.length) {
				const team = teams[ti % teams.length]!;
				if ((result[team.id]?.length || 0) < targetPerTeam[team.id]) {
					result[team.id].push(p.id);
					used.add(p.id);
					ti++;
					break;
				} else {
					ti++;
					attempts++;
				}
			}
		}

		const getCount = (tid: string) => result[tid]?.length || 0;
		const hasNonGK = (tid: string) => {
			const ids = result[tid] || [];
			return ids.some((pid) => allPlayers.find((p) => p.id === pid)?.position !== "GOL");
		};
		const getFirstMovable = (tid: string) => {
			const ids = result[tid] || [];
			const idx = ids.findIndex((pid) => allPlayers.find((p) => p.id === pid)?.position !== "GOL");
			return idx >= 0 ? { pid: ids[idx]!, idx } : null;
		};
		let safety = 0;
		while (safety++ < 100) {
			const sorted = teams.map((t) => ({ t, c: getCount(t.id) })).sort((a, b) => b.c - a.c);
			const max = sorted[0]?.c ?? 0;
			const min = sorted[sorted.length - 1]?.c ?? 0;
			if (max - min <= 1) break;
			const donors = sorted.filter((x) => x.c === max && hasNonGK(x.t.id));
			const receivers = sorted.filter(
				(x) => x.c === min && (result[x.t.id]?.length || 0) < targetPerTeam[x.t.id],
			);
			if (!donors.length || !receivers.length) break;
			const from = donors[0]!.t.id;
			const to = receivers[0]!.t.id;
			const movable = getFirstMovable(from);
			if (!movable) break;
			result[from]!.splice(movable.idx, 1);
			(result[to] ||= []).push(movable.pid);
		}

		// merge into global assignments without touching other categories
		const next: Assignments = { ...state.assignments };
		for (const tid of Object.keys(result)) next[tid] = result[tid]!;
		dispatch({ type: "SET_ASSIGNMENTS", payload: next });
	};

	const generateMatches = (phase: Phase, teamIds: string[]) => {
		const cat = state.activeCategoryId || state.categories[0]?.id || "";
		const inCat = (tid: string) => state.teams.find((t) => t.id === tid)?.categoryId === cat;
		const existing = new Set(
			state.matches
				.filter((m) => m.phase === phase && m.categoryId === cat)
				.map((m) => [m.leftTeamId, m.rightTeamId].sort().join("::")),
		);

		let pairs: [string, string][] = [];
		if (phase === "Classificação") {
			state.matches
				.filter((m) => m.phase === phase && m.categoryId === cat)
				.forEach((m) => baseDispatch({ type: "DELETE_MATCH", payload: { id: m.id } }));
			const pool = shuffle(teamIds.slice().filter(inCat));
			const picked = pool.slice(0, Math.min(8, pool.length));
			const groupA = picked.slice(0, Math.min(4, picked.length));
			const groupB = picked.slice(4, Math.min(8, picked.length));
			const groupMap: Record<string, string> = {};
			for (const t of groupA) groupMap[t] = "A";
			for (const t of groupB) groupMap[t] = "B";
			dispatch({ type: "SET_GROUPS", payload: groupMap });
			const mkPairs = (arr: string[]): [string, string][] => {
				const ids = shuffle(arr.slice());
				const ps: [string, string][] = [];
				for (let i = 0; i + 1 < ids.length; i += 2)
					ps.push([ids[i]!, ids[i + 1]!] as [string, string]);
				return ps;
			};
			pairs = [...mkPairs(groupA), ...mkPairs(groupB)];
		} else {
			const ids = teamIds.slice().filter(inCat);
			for (let i = 0; i + 1 < ids.length; i += 2)
				pairs.push([ids[i]!, ids[i + 1]!] as [string, string]);
		}

		const created: Match[] = pairs
			.filter(([a, b]) => !existing.has([a, b].sort().join("::")))
			.map(([leftTeamId, rightTeamId]) => ({
				id: crypto.randomUUID(),
				leftTeamId,
				rightTeamId,
				phase,
				half: 1,
				remainingMs: 20 * 60 * 1000,
				startedAt: null,
				events: {},
				categoryId: cat,
			}));

		if (created.length) dispatch({ type: "ADD_MATCHES", payload: created });
	};

	function getQualifiersForPhase(phase: Exclude<Phase, "Classificação">, totalTeams: number) {
		const key =
			phase === "Oitavas"
				? "NEXT_PUBLIC_QUALIFIERS_OITAVAS"
				: phase === "Quartas"
					? "NEXT_PUBLIC_QUALIFIERS_QUARTAS"
					: phase === "Semifinal"
						? "NEXT_PUBLIC_QUALIFIERS_SEMIFINAL"
						: "NEXT_PUBLIC_QUALIFIERS_FINAL";
		const raw = (process.env as any)[key];
		const n = raw ? parseInt(String(raw), 10) : NaN;
		if (Number.isFinite(n) && n > 1) return Math.min(n, totalTeams);
		if (phase === "Oitavas") return Math.min(16, totalTeams);
		if (phase === "Quartas") return Math.min(8, totalTeams);
		if (phase === "Semifinal") return Math.min(4, totalTeams);
		return Math.min(2, totalTeams);
	}

	function generateEliminationFromStandings(phase: Exclude<Phase, "Classificação">) {
		const cat = state.activeCategoryId || state.categories[0]?.id || "";
		const teamsInCat = state.teams.filter((t) => t.categoryId === cat);
		const totalTeams = teamsInCat.length;
		const qualifiers = getQualifiersForPhase(phase, totalTeams);

		const stats = new Map<
			string,
			{ teamId: string; name: string; color: string; Pts: number; SG: number; GF: number }
		>();
		for (const t of teamsInCat)
			stats.set(t.id, { teamId: t.id, name: t.name, color: t.color, Pts: 0, SG: 0, GF: 0 });

		const goalsFor = (teamId: string, match: Match) => {
			const ids = state.assignments[teamId] || [];
			let s = 0;
			for (const pid of ids) {
				const ev = match.events[pid];
				if (ev) s += ev.goals;
			}
			return s;
		};

		for (const m of state.matches.filter(
			(m) => m.phase === "Classificação" && m.categoryId === cat,
		)) {
			const A = stats.get(m.leftTeamId);
			const B = stats.get(m.rightTeamId);
			if (!A || !B) continue;
			const ga = goalsFor(A.teamId, m);
			const gb = goalsFor(B.teamId, m);
			A.GF += ga;
			B.GF += gb;
			A.SG += ga - gb;
			B.SG += gb - ga;
			if (ga > gb) A.Pts += 3;
			else if (ga < gb) B.Pts += 3;
			else {
				A.Pts += 1;
				B.Pts += 1;
			}
		}

		let seeds: string[] = [];
		const table = Array.from(stats.values()).sort(
			(a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GF - a.GF || a.name.localeCompare(b.name),
		);
		seeds = table.slice(0, Math.min(qualifiers, table.length)).map((r) => r.teamId);

		const pairs: [string, string][] = [];
		if (seeds.length >= 4 && seeds.length % 4 === 0) {
			const groupsCount = seeds.length / 4;
			const groups: string[][] = Array.from({ length: groupsCount }, () => []);
			for (let g = 0; g < groupsCount; g++) groups[g].push(seeds[g]!);
			for (let g = 0; g < groupsCount; g++)
				groups[groupsCount - 1 - g].push(seeds[groupsCount + g]!);
			for (let g = 0; g < groupsCount; g++) groups[g].push(seeds[2 * groupsCount + g]!);
			for (let g = 0; g < groupsCount; g++)
				groups[groupsCount - 1 - g].push(seeds[3 * groupsCount + g]!);
			for (const group of groups)
				if (group.length === 4) {
					pairs.push([group[0]!, group[3]!] as [string, string]);
					pairs.push([group[1]!, group[2]!] as [string, string]);
				}
		} else {
			for (let i = 0; i + 1 < seeds.length; i += 2)
				pairs.push([seeds[i]!, seeds[i + 1]!] as [string, string]);
		}

		state.matches
			.filter((m) => m.phase === phase && m.categoryId === cat)
			.forEach((m) => baseDispatch({ type: "DELETE_MATCH", payload: { id: m.id } }));

		const created: Match[] = pairs.map(([leftTeamId, rightTeamId]) => ({
			id: crypto.randomUUID(),
			leftTeamId,
			rightTeamId,
			phase,
			half: 1,
			remainingMs: 20 * 60 * 1000,
			startedAt: null,
			events: {},
			categoryId: cat,
		}));
		if (created.length) dispatch({ type: "ADD_MATCHES", payload: created });
	}

	const updatePlayerStat = (
		matchId: string,
		playerId: string,
		updater: (prev: PlayerStats) => PlayerStats,
	) => {
		const match = state.matches.find((m) => m.id === matchId);
		if (!match) return;
		const prev = match.events[playerId] || { goals: 0, yellow: 0, red: false, destaque: false };
		const nextStats = updater(prev);
		const updated: Match = { ...match, events: { ...match.events, [playerId]: nextStats } };
		baseDispatch({ type: "UPDATE_MATCH", payload: updated });
		const cat = state.activeCategoryId || state.categories[0]?.id || null;
		const wsId = state.activeWorkspaceId || null;
		void supabase
			.from("match_events")
			.upsert(
				{
					match_id: matchId,
					player_id: playerId,
					goals: nextStats.goals,
					yellow: nextStats.yellow,
					red: nextStats.red,
					destaque: nextStats.destaque,
					owner_id: userId || null,
					category_id: cat,
					workspace_id: wsId,
				},
				{ onConflict: "match_id,player_id,owner_id,category_id" },
			)
			.throwOnError();
	};

	const setUniqueDestaque = (matchId: string, playerId: string) => {
		const match = state.matches.find((m) => m.id === matchId);
		if (!match) return;
		const current = match.events[playerId] || { goals: 0, yellow: 0, red: false, destaque: false };
		const willBe = !current.destaque;
		const newEvents: Record<string, PlayerStats> = {};
		for (const [pid, stats] of Object.entries(match.events))
			newEvents[pid] = { ...stats, destaque: false };
		newEvents[playerId] = { ...current, destaque: willBe };
		const updated: Match = { ...match, events: newEvents };
		baseDispatch({ type: "UPDATE_MATCH", payload: updated });

		const allPids = Array.from(new Set([...Object.keys(newEvents), playerId]));
		const cat = state.activeCategoryId || state.categories[0]?.id || null;
		const wsId = state.activeWorkspaceId || null;
		const ops = allPids.map((pid) =>
			supabase
				.from("match_events")
				.upsert(
					{
						match_id: matchId,
						player_id: pid,
						goals: newEvents[pid]?.goals ?? 0,
						yellow: newEvents[pid]?.yellow ?? 0,
						red: newEvents[pid]?.red ?? false,
						destaque: pid === playerId ? willBe : false,
						owner_id: userId || null,
						category_id: cat,
						workspace_id: wsId,
					},
					{ onConflict: "match_id,player_id,owner_id,category_id" },
				)
				.throwOnError(),
		);
		void Promise.all(ops);
	};

	const startPauseTimer = (matchId: string) => {
		const match = state.matches.find((m) => m.id === matchId);
		if (!match) return;
		const updated: Match = { ...match, startedAt: match.startedAt ? null : Date.now() };
		baseDispatch({ type: "UPDATE_MATCH", payload: updated });
		void supabase
			.from("matches")
			.update({ started_at: updated.startedAt ? new Date(updated.startedAt).toISOString() : null })
			.eq("id", matchId);
	};

	const resetTimer = (matchId: string) => {
		const match = state.matches.find((m) => m.id === matchId);
		if (!match) return;
		const updated: Match = { ...match, startedAt: null, remainingMs: 20 * 60 * 1000 };
		baseDispatch({ type: "UPDATE_MATCH", payload: updated });
		void supabase
			.from("matches")
			.update({ started_at: null, remaining_ms: updated.remainingMs })
			.eq("id", matchId);
	};

	const nextHalf = (matchId: string) => {
		const match = state.matches.find((m) => m.id === matchId);
		if (!match) return;
		const newHalf = match.half === 1 ? 2 : 1;
		const updated: Match = {
			...match,
			half: newHalf,
			startedAt: null,
			remainingMs: 20 * 60 * 1000,
		};
		baseDispatch({ type: "UPDATE_MATCH", payload: updated });
		void supabase
			.from("matches")
			.update({ half: updated.half, started_at: null, remaining_ms: updated.remainingMs })
			.eq("id", matchId);
	};

	const value = useMemo(
		() => ({
			state,
			dispatch,
			drawTeams,
			generateMatches,
			generateEliminationFromStandings,
			resetDrawAndPhases: () => dispatch({ type: "RESET_TEAMS_AND_PHASES" }),
			updatePlayerStat,
			setUniqueDestaque,
			startPauseTimer,
			resetTimer,
			nextHalf,
		}),
		[state],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
	const ctx = useContext(AppContext);
	if (!ctx) throw new Error("useApp must be used within AppProvider");
	return ctx;
};

function shuffle<T>(arr: T[]): T[] {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function buildMockState(): State {
	return initialState;
}
