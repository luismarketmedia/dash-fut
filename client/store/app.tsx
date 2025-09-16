"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";

export type Position =
  | "GOL"
  | "FIXO"
  | "MEIO"
  | "ALA DIREITA"
  | "ALA ESQUERDA"
  | "FRENTE";

export interface Player {
  id: string;
  jerseyNumber: number;
  name: string;
  position: Position;
  paid: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string; // hex
  capacity: number; // desired number of players
}

export type Phase =
  | "Classificação"
  | "Oitavas"
  | "Quartas"
  | "Semifinal"
  | "Final";

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
  remainingMs: number; // per half countdown remaining
  events: Record<string, PlayerStats>; // by playerId
}

export interface Assignments {
  [teamId: string]: string[]; // playerIds per team
}

interface State {
  players: Player[];
  teams: Team[];
  assignments: Assignments; // result of last draw
  matches: Match[];
}

const initialState: State = {
  players: [],
  teams: [],
  assignments: {},
  matches: [],
};

// Helpers
const STORAGE_KEY = "futebol-dashboard-state-v1";

function loadState(): State {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as State;
    if (
      !parsed.players ||
      !parsed.teams ||
      !parsed.matches ||
      !parsed.assignments
    ) {
      return initialState;
    }
    return parsed;
  } catch {
    return initialState;
  }
}

function saveState(state: State) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

// Actions

type Action =
  | { type: "HYDRATE"; payload: State }
  | { type: "ADD_PLAYER"; payload: Omit<Player, "id"> | Player }
  | { type: "UPDATE_PLAYER"; payload: Player }
  | { type: "DELETE_PLAYER"; payload: { id: string } }
  | { type: "ADD_TEAM"; payload: Omit<Team, "id"> | Team }
  | { type: "UPDATE_TEAM"; payload: Team }
  | { type: "DELETE_TEAM"; payload: { id: string } }
  | { type: "SET_ASSIGNMENTS"; payload: Assignments }
  | { type: "ADD_MATCHES"; payload: Match[] }
  | { type: "UPDATE_MATCH"; payload: Match }
  | { type: "DELETE_MATCH"; payload: { id: string } }
  | { type: "CLEAR_MATCHES" }
  | { type: "RESET_TEAMS_AND_PHASES" }
  | { type: "RESET_ALL" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE": {
      const next = action.payload;
      return next;
    }
    case "ADD_PLAYER": {
      const payload = action.payload as any;
      const withId: Player =
        "id" in payload ? payload : { id: crypto.randomUUID(), ...payload };
      const next = { ...state, players: [...state.players, withId] };
      return next;
    }
    case "UPDATE_PLAYER": {
      const next = {
        ...state,
        players: state.players.map((p) =>
          p.id === action.payload.id ? action.payload : p,
        ),
      };
      return next;
    }
    case "DELETE_PLAYER": {
      const assignments: Assignments = Object.fromEntries(
        Object.entries(state.assignments).map(([tid, list]) => [
          tid,
          list.filter((pid) => pid !== action.payload.id),
        ]),
      );
      const next = {
        ...state,
        players: state.players.filter((p) => p.id !== action.payload.id),
        assignments,
      };
      return next;
    }
    case "ADD_TEAM": {
      const payload = action.payload as any;
      const withId: Team =
        "id" in payload ? payload : { id: crypto.randomUUID(), ...payload };
      const next = {
        ...state,
        teams: [...state.teams, withId],
        assignments: { ...state.assignments, [withId.id]: [] },
      };
      return next;
    }
    case "UPDATE_TEAM": {
      const next = {
        ...state,
        teams: state.teams.map((t) =>
          t.id === action.payload.id ? action.payload : t,
        ),
      };
      return next;
    }
    case "DELETE_TEAM": {
      const { [action.payload.id]: _removed, ...rest } = state.assignments;
      const next = {
        ...state,
        teams: state.teams.filter((t) => t.id !== action.payload.id),
        assignments: rest,
      };
      return next;
    }
    case "SET_ASSIGNMENTS": {
      return { ...state, assignments: action.payload };
    }
    case "ADD_MATCHES": {
      return { ...state, matches: [...state.matches, ...action.payload] };
    }
    case "UPDATE_MATCH": {
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.payload.id ? action.payload : m,
        ),
      };
    }
    case "DELETE_MATCH": {
      return {
        ...state,
        matches: state.matches.filter((m) => m.id !== action.payload.id),
      };
    }
    case "CLEAR_MATCHES": {
      return { ...state, matches: [] };
    }
    case "RESET_TEAMS_AND_PHASES": {
      return { ...state, assignments: {}, matches: [] };
    }
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
  generateEliminationFromStandings: (
    phase: Exclude<Phase, "Classificação">,
  ) => void;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, baseDispatch] = useReducer(reducer, initialState);

  // Hydrate from localStorage (client-only). If no Supabase and missing core data, seed mocks.
  const hydratedRef = useRef(false);
  useEffect(() => {
    const ls = loadState();
    const hasSupabase = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const shouldSeed =
      !hasSupabase && (!ls.players?.length || !ls.teams?.length);
    const payload = shouldSeed ? buildMockState() : ls;
    baseDispatch({ type: "HYDRATE", payload: payload });
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to local storage for offline fallback, after hydration
  useEffect(() => {
    if (!hydratedRef.current) return;
    saveState(state);
  }, [state]);

  // Hydrate from Supabase on first load
  useEffect(() => {
    const load = async () => {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
        return;
      const [
        { data: players },
        { data: teams },
        { data: assignments },
        { data: matches },
        { data: events },
      ] = await Promise.all([
        supabase
          .from("players")
          .select("id, jersey_number, name, position, paid")
          .then((r) => ({
            data: (r.data || []).map((p: any) => ({
              id: p.id,
              jerseyNumber: p.jersey_number,
              name: p.name,
              position: p.position,
              paid: p.paid,
            })),
          })),
        supabase
          .from("teams")
          .select("id, name, color, capacity")
          .then((r) => ({ data: (r.data || []) as any })),
        supabase
          .from("assignments")
          .select("team_id, player_id")
          .then((r) => ({ data: (r.data || []) as any })),
        supabase
          .from("matches")
          .select(
            "id, left_team_id, right_team_id, phase, started_at, half, remaining_ms",
          )
          .then((r) => ({ data: (r.data || []) as any })),
        supabase
          .from("match_events")
          .select("match_id, player_id, goals, yellow, red, destaque")
          .then((r) => ({ data: (r.data || []) as any })),
      ]);

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
      }));

      const teamsNorm: Team[] = (teams || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        capacity: t.capacity,
      }));

      baseDispatch({
        type: "HYDRATE",
        payload: {
          players: (players || []) as Player[],
          teams: teamsNorm,
          assignments: assignMap,
          matches: matchesNorm,
        },
      });
      hydratedRef.current = true;
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wrapper dispatch to also persist to Supabase
  const dispatch = (action: Action) => {
    let transformed: Action = action;
    if (action.type === "ADD_PLAYER" && !("id" in (action.payload as any))) {
      transformed = {
        type: "ADD_PLAYER",
        payload: { id: crypto.randomUUID(), ...(action.payload as any) },
      } as Action;
    }
    if (action.type === "ADD_TEAM" && !("id" in (action.payload as any))) {
      transformed = {
        type: "ADD_TEAM",
        payload: { id: crypto.randomUUID(), ...(action.payload as any) },
      } as Action;
    }
    baseDispatch(transformed);
    void persistAction(transformed);
  };

  async function persistAction(action: Action) {
    try {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
        return;
      switch (action.type) {
        case "ADD_PLAYER": {
          const p = action.payload as Player | Omit<Player, "id">;
          const payload = (p as any).id
            ? {
                id: (p as any).id,
                jersey_number: (p as any).jerseyNumber,
                name: (p as any).name,
                position: (p as any).position,
                paid: (p as any).paid,
              }
            : {
                jersey_number: (p as any).jerseyNumber,
                name: (p as any).name,
                position: (p as any).position,
                paid: (p as any).paid,
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
          await supabase
            .from("players")
            .delete()
            .eq("id", action.payload.id)
            .throwOnError();
          break;
        }
        case "ADD_TEAM": {
          const t = action.payload as Team | Omit<Team, "id">;
          const payload = (t as any).id
            ? {
                id: (t as any).id,
                name: (t as any).name,
                color: (t as any).color,
                capacity: (t as any).capacity,
              }
            : {
                name: (t as any).name,
                color: (t as any).color,
                capacity: (t as any).capacity,
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
          await supabase
            .from("teams")
            .delete()
            .eq("id", action.payload.id)
            .throwOnError();
          break;
        }
        case "SET_ASSIGNMENTS": {
          const rows: { team_id: string; player_id: string }[] = [];
          for (const [team_id, list] of Object.entries(action.payload)) {
            for (const player_id of list) rows.push({ team_id, player_id });
          }
          await supabase
            .from("assignments")
            .delete()
            .neq("team_id", "")
            .throwOnError();
          if (rows.length)
            await supabase.from("assignments").insert(rows).throwOnError();
          break;
        }
        case "ADD_MATCHES": {
          if (!action.payload.length) break;
          const rows = action.payload.map((m) => ({
            id: m.id,
            left_team_id: m.leftTeamId,
            right_team_id: m.rightTeamId,
            phase: m.phase,
            started_at: m.startedAt
              ? new Date(m.startedAt).toISOString()
              : null,
            half: m.half,
            remaining_ms: m.remainingMs,
          }));
          await supabase.from("matches").insert(rows).throwOnError();
          break;
        }
        case "DELETE_MATCH": {
          await supabase
            .from("matches")
            .delete()
            .eq("id", action.payload.id)
            .throwOnError();
          break;
        }
        case "CLEAR_MATCHES": {
          await Promise.all([
            supabase
              .from("match_events")
              .delete()
              .neq("match_id", "")
              .throwOnError(),
            supabase.from("matches").delete().neq("id", "").throwOnError(),
          ]);
          break;
        }
        case "UPDATE_MATCH": {
          // Skip frequent timer ticks to avoid heavy writes. Explicit operations handle persistence.
          break;
        }
        case "RESET_ALL": {
          await Promise.all([
            supabase.from("match_events").delete().neq("match_id", "").throwOnError(),
            supabase.from("assignments").delete().neq("team_id", "").throwOnError(),
            supabase.from("matches").delete().neq("id", "").throwOnError(),
            supabase.from("players").delete().neq("id", "").throwOnError(),
            supabase.from("teams").delete().neq("id", "").throwOnError(),
          ]);
          break;
        }
        case "RESET_TEAMS_AND_PHASES": {
          await Promise.all([
            supabase.from("match_events").delete().neq("match_id", "").throwOnError(),
            supabase.from("assignments").delete().neq("team_id", "").throwOnError(),
            supabase.from("matches").delete().neq("id", "").throwOnError(),
          ]);
          break;
        }
      }
    } catch (e) {
      // Swallow errors to keep UI responsive; consider toast/logging here
      console.error(e);
    }
  }

  // Timer tick (local only)
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const running = state.matches.filter((m) => m.startedAt);
      if (running.length === 0) return;
      running.forEach((m) => {
        const elapsed = now - (m.startedAt || 0);
        const newRemaining = Math.max(0, m.remainingMs - elapsed);
        const updated: Match = {
          ...m,
          remainingMs: newRemaining,
          startedAt: now,
        };
        if (newRemaining === 0) updated.startedAt = null;
        baseDispatch({ type: "UPDATE_MATCH", payload: updated });
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.matches]);

  const drawTeams = (paidOnly?: boolean) => {
    const teams = state.teams;
    const allPlayers = paidOnly ? state.players.filter((p) => p.paid) : state.players;
    if (teams.length === 0) return;

    const result: Assignments = Object.fromEntries(
      teams.map((t) => [t.id, [] as string[]]),
    );
    const used = new Set<string>();

    const basePositions: Position[] = [
      "GOL",
      "FIXO",
      "MEIO",
      "ALA DIREITA",
      "ALA ESQUERDA",
      "FRENTE",
    ];

    const byPos: Record<Position, Player[]> = {
      GOL: [],
      FIXO: [],
      MEIO: [],
      "ALA DIREITA": [],
      "ALA ESQUERDA": [],
      FRENTE: [],
    };
    for (const p of allPlayers) {
      (byPos[p.position] ||= []).push(p);
    }
    for (const pos of basePositions) byPos[pos] = shuffle(byPos[pos] || []);

    const posPtr: Record<Position, number> = {
      GOL: 0,
      FIXO: 0,
      MEIO: 0,
      "ALA DIREITA": 0,
      "ALA ESQUERDA": 0,
      FRENTE: 0,
    };

    const targetPerTeam: Record<string, number> = {};
    for (const t of teams) {
      targetPerTeam[t.id] = Math.min(t.capacity, basePositions.length + 2);
    }

    // Assign mandatory roles: 1 per position per team when available
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

    // Reserves: fill remaining slots with non-goalkeepers only
    const reservesPool = shuffle(
      allPlayers.filter((p) => p.position !== "GOL" && !used.has(p.id)),
    );
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

    dispatch({ type: "SET_ASSIGNMENTS", payload: result });
  };

  const generateMatches = (phase: Phase, teamIds: string[]) => {
    const existing = new Set(
      state.matches
        .filter((m) => m.phase === phase)
        .map((m) => [m.leftTeamId, m.rightTeamId].sort().join("::")),
    );

    let pairs: [string, string][] = [];

    if (phase === "Classificação") {
      const ids = shuffle(teamIds.slice());
      if (ids.length % 2 !== 0) ids.push("_BYE_");
      const n = ids.length;
      const rounds: [string, string][][] = [];
      let arr = ids.slice();
      for (let r = 0; r < n - 1; r++) {
        let round: [string, string][] = [];
        for (let i = 0; i < n / 2; i++) {
          const a = arr[i]!;
          const b = arr[n - 1 - i]!;
          if (a !== "_BYE_" && b !== "_BYE_") round.push([a, b]);
        }
        // randomize order of games in this round
        round = shuffle(round);
        rounds.push(round);
        // rotate all except first element
        const fixed = arr[0]!;
        const rest = arr.slice(1);
        rest.unshift(rest.pop()!);
        arr = [fixed, ...rest];
      }
      // If user expects number_of_teams rounds, add an extra round by swapping home/away of first round (keeps constraints, order randomized)
      if (rounds.length < n) {
        const extra = shuffle(
          rounds[0]!.map(([a, b]) => [b, a] as [string, string]),
        );
        rounds.push(extra);
      }
      pairs = rounds.flat();
    } else {
      // Elimination: pair sequentially based on provided order (can be seeded externally)
      const ids = teamIds.slice();
      for (let i = 0; i + 1 < ids.length; i += 2) {
        pairs.push([ids[i]!, ids[i + 1]!]);
      }
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
      }));

    if (created.length) dispatch({ type: "ADD_MATCHES", payload: created });
  };

  function getQualifiersForPhase(
    phase: Exclude<Phase, "Classificação">,
    totalTeams: number,
  ) {
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
    let base: number;
    if (Number.isFinite(n) && n > 1) base = Math.min(n, totalTeams);
    else if (phase === "Oitavas") base = Math.min(16, totalTeams);
    else if (phase === "Quartas") base = Math.min(8, totalTeams);
    else if (phase === "Semifinal") base = Math.min(4, totalTeams);
    else base = Math.min(2, totalTeams);

    if (phase === "Oitavas" || phase === "Quartas") {
      if (base < 4) return base;
      // Enforce groups of 4 logic
      const coerced = base - (base % 4);
      return Math.max(4, Math.min(coerced, totalTeams));
    }
    return base;
  }

  function generateEliminationFromStandings(
    phase: Exclude<Phase, "Classificação">,
  ) {
    const totalTeams = state.teams.length;
    const qualifiers = getQualifiersForPhase(phase, totalTeams);

    const stats = new Map<
      string,
      {
        teamId: string;
        name: string;
        color: string;
        Pts: number;
        SG: number;
        GF: number;
      }
    >();
    for (const t of state.teams)
      stats.set(t.id, {
        teamId: t.id,
        name: t.name,
        color: t.color,
        Pts: 0,
        SG: 0,
        GF: 0,
      });

    const goalsFor = (teamId: string, match: Match) => {
      const ids = state.assignments[teamId] || [];
      let s = 0;
      for (const pid of ids) {
        const ev = match.events[pid];
        if (ev) s += ev.goals;
      }
      return s;
    };

    for (const m of state.matches) {
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

    const table = Array.from(stats.values()).sort(
      (a, b) =>
        b.Pts - a.Pts ||
        b.SG - a.SG ||
        b.GF - a.GF ||
        a.name.localeCompare(b.name),
    );
    const seeds = table
      .slice(0, Math.min(qualifiers, table.length))
      .map((r) => r.teamId);

    const pairs: [string, string][] = [];

    if (seeds.length >= 4 && seeds.length % 4 === 0) {
      const groupsCount = seeds.length / 4;
      const groups: string[][] = Array.from({ length: groupsCount }, () => []);
      // Snake seeding across groups of 4
      // Row 1 (ascending)
      for (let g = 0; g < groupsCount; g++) groups[g].push(seeds[g]!);
      // Row 2 (descending)
      for (let g = 0; g < groupsCount; g++) groups[groupsCount - 1 - g].push(seeds[groupsCount + g]!);
      // Row 3 (ascending)
      for (let g = 0; g < groupsCount; g++) groups[g].push(seeds[2 * groupsCount + g]!);
      // Row 4 (descending)
      for (let g = 0; g < groupsCount; g++) groups[groupsCount - 1 - g].push(seeds[3 * groupsCount + g]!);

      for (const group of groups) {
        if (group.length === 4) {
          // Pair inside each chave: (1 vs 4) and (2 vs 3)
          pairs.push([group[0]!, group[3]!] as [string, string]);
          pairs.push([group[1]!, group[2]!] as [string, string]);
        }
      }
    } else {
      // Fallback: pair sequentially
      for (let i = 0; i + 1 < seeds.length; i += 2) {
        pairs.push([seeds[i]!, seeds[i + 1]!] as [string, string]);
      }
    }

    // Remove existing matches for this phase to avoid leftovers when qualifiers change
    state.matches
      .filter((m) => m.phase === phase)
      .forEach((m) =>
        baseDispatch({ type: "DELETE_MATCH", payload: { id: m.id } }),
      );

    const created: Match[] = pairs.map(([leftTeamId, rightTeamId]) => ({
      id: crypto.randomUUID(),
      leftTeamId,
      rightTeamId,
      phase,
      half: 1,
      remainingMs: 20 * 60 * 1000,
      startedAt: null,
      events: {},
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
    const prev = match.events[playerId] || {
      goals: 0,
      yellow: 0,
      red: false,
      destaque: false,
    };
    const nextStats = updater(prev);
    const updated: Match = {
      ...match,
      events: { ...match.events, [playerId]: nextStats },
    };
    baseDispatch({ type: "UPDATE_MATCH", payload: updated });
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
        },
        { onConflict: "match_id,player_id" },
      )
      .throwOnError();
  };

  const setUniqueDestaque = (matchId: string, playerId: string) => {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return;
    const current = match.events[playerId] || {
      goals: 0,
      yellow: 0,
      red: false,
      destaque: false,
    };
    const willBe = !current.destaque;
    const newEvents: Record<string, PlayerStats> = {};
    for (const [pid, stats] of Object.entries(match.events))
      newEvents[pid] = { ...stats, destaque: false };
    newEvents[playerId] = { ...current, destaque: willBe };
    const updated: Match = { ...match, events: newEvents };
    baseDispatch({ type: "UPDATE_MATCH", payload: updated });
    const ops: Promise<any>[] = [];
    for (const pid of Object.keys(match.events)) {
      ops.push(
        supabase
          .from("match_events")
          .upsert(
            {
              match_id: matchId,
              player_id: playerId,
              goals: newEvents[playerId].goals,
              yellow: newEvents[playerId].yellow,
              red: newEvents[playerId].red,
              destaque: willBe,
            },
            { onConflict: "match_id,player_id" },
          )
          .throwOnError(), // garante que seja Promise
      );
    }
    ops.push(
      supabase.from("match_events").upsert(
        {
          match_id: matchId,
          player_id: playerId,
          goals: newEvents[playerId].goals,
          yellow: newEvents[playerId].yellow,
          red: newEvents[playerId].red,
          destaque: willBe,
        },
        { onConflict: "match_id,player_id" },
      ),
    );
    void Promise.all(ops);
  };

  const startPauseTimer = (matchId: string) => {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return;
    const updated: Match = {
      ...match,
      startedAt: match.startedAt ? null : Date.now(),
    };
    baseDispatch({ type: "UPDATE_MATCH", payload: updated });
    void supabase
      .from("matches")
      .update({
        started_at: updated.startedAt
          ? new Date(updated.startedAt).toISOString()
          : null,
      })
      .eq("id", matchId);
  };

  const resetTimer = (matchId: string) => {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return;
    const updated: Match = {
      ...match,
      startedAt: null,
      remainingMs: 20 * 60 * 1000,
    };
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
      .update({
        half: updated.half,
        started_at: null,
        remaining_ms: updated.remainingMs,
      })
      .eq("id", matchId);
  };

  const resetDrawAndPhases = () => {
    dispatch({ type: "RESET_TEAMS_AND_PHASES" });
  };

  const value = useMemo(
    () => ({
      state,
      dispatch,
      drawTeams,
      generateMatches,
      generateEliminationFromStandings,
      resetDrawAndPhases,
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
  const teamNames = [
    "Leões",
    "Panteras",
    "Falcões",
    "Tubarões",
    "Lobos",
    "Águias",
    "Rinocerontes",
    "Tigres",
  ];
  const teamColors = [
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
  ];
  const teams: Team[] = teamNames.map((name, i) => ({
    id: crypto.randomUUID(),
    name,
    color: teamColors[i]!,
    capacity: 8,
  }));

  const otherPositions: Position[] = [
    "FIXO",
    "MEIO",
    "ALA DIREITA",
    "ALA ESQUERDA",
    "FRENTE",
  ];

  const players: Player[] = Array.from({ length: 64 }, (_, i) => {
    const idx = i + 1;
    const isGK = i % 8 === 0; // 8 goleiros distribuídos
    const pos: Position = isGK
      ? "GOL"
      : otherPositions[i % otherPositions.length]!;
    return {
      id: crypto.randomUUID(),
      jerseyNumber: idx,
      name: `Jogador ${idx}`,
      position: pos,
      paid: Math.random() < 0.6,
    };
  });

  const assignments: Assignments = Object.fromEntries(
    teams.map((t) => [t.id, [] as string[]]),
  );

  return {
    players,
    teams,
    assignments,
    matches: [],
  };
}
