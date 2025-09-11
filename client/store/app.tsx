import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as State;
    // Basic validation
    if (!parsed.players || !parsed.teams || !parsed.matches || !parsed.assignments) {
      return initialState;
    }
    return parsed;
  } catch {
    return initialState;
  }
}

function saveState(state: State) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Actions

type Action =
  | { type: "ADD_PLAYER"; payload: Omit<Player, "id"> }
  | { type: "UPDATE_PLAYER"; payload: Player }
  | { type: "DELETE_PLAYER"; payload: { id: string } }
  | { type: "ADD_TEAM"; payload: Omit<Team, "id"> }
  | { type: "UPDATE_TEAM"; payload: Team }
  | { type: "DELETE_TEAM"; payload: { id: string } }
  | { type: "SET_ASSIGNMENTS"; payload: Assignments }
  | { type: "ADD_MATCHES"; payload: Match[] }
  | { type: "UPDATE_MATCH"; payload: Match }
  | { type: "DELETE_MATCH"; payload: { id: string } }
  | { type: "RESET_ALL" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_PLAYER": {
      const newPlayer: Player = { id: crypto.randomUUID(), ...action.payload };
      const next = { ...state, players: [...state.players, newPlayer] };
      return next;
    }
    case "UPDATE_PLAYER": {
      const next = {
        ...state,
        players: state.players.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };
      return next;
    }
    case "DELETE_PLAYER": {
      // remove from assignments too
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
      const newTeam: Team = { id: crypto.randomUUID(), ...action.payload };
      const next = {
        ...state,
        teams: [...state.teams, newTeam],
        assignments: { ...state.assignments, [newTeam.id]: [] },
      };
      return next;
    }
    case "UPDATE_TEAM": {
      const next = {
        ...state,
        teams: state.teams.map((t) => (t.id === action.payload.id ? action.payload : t)),
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
        matches: state.matches.map((m) => (m.id === action.payload.id ? action.payload : m)),
      };
    }
    case "DELETE_MATCH": {
      return { ...state, matches: state.matches.filter((m) => m.id !== action.payload.id) };
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
  drawTeams: () => void;
  generateMatches: (phase: Phase, teamIds: string[]) => void;
  updatePlayerStat: (
    matchId: string,
    playerId: string,
    updater: (prev: PlayerStats) => PlayerStats,
  ) => void;
  startPauseTimer: (matchId: string) => void;
  resetTimer: (matchId: string) => void;
  nextHalf: (matchId: string) => void;
} | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as State, () => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Timer tick
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      // We cannot dispatch in a tight loop for each match; handle only those running
      const running = state.matches.filter((m) => m.startedAt);
      if (running.length === 0) return;
      running.forEach((m) => {
        const elapsed = now - (m.startedAt || 0);
        const newRemaining = Math.max(0, m.remainingMs - elapsed);
        const updated: Match = { ...m, remainingMs: newRemaining, startedAt: now };
        if (newRemaining === 0) {
          updated.startedAt = null;
        }
        dispatch({ type: "UPDATE_MATCH", payload: updated });
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.matches]);

  const drawTeams = () => {
    const teams = state.teams;
    const players = state.players;
    if (teams.length === 0) return;

    // Separate goalkeepers
    const gks = players.filter((p) => p.position === "GOL");
    const others = players.filter((p) => p.position !== "GOL");

    // Initialize assignment arrays
    const result: Assignments = Object.fromEntries(teams.map((t) => [t.id, [] as string[]]));

    // Step 1: one GK per team if available
    const shuffledGk = shuffle(gks);
    teams.forEach((team, idx) => {
      const gk = shuffledGk[idx];
      if (gk) result[team.id].push(gk.id);
    });

    // Step 2: distribute remaining players round-robin, respecting capacity
    const byTeamLoad = () => teams.map((t) => result[t.id].length);
    const cap = (t: Team) => t.capacity;

    const pool = shuffle(others.concat(shuffledGk.slice(teams.length))); // leftover GK if any
    let ti = 0;
    for (const p of pool) {
      let attempts = 0;
      while (attempts < teams.length) {
        const team = teams[ti % teams.length];
        if (result[team.id].length < cap(team)) {
          result[team.id].push(p.id);
          ti++;
          break;
        } else {
          ti++;
          attempts++;
        }
      }
    }

    // Optional small balancing: sort teams by load and rotate
    const loads = byTeamLoad();
    void loads;

    dispatch({ type: "SET_ASSIGNMENTS", payload: result });
  };

  const generateMatches = (phase: Phase, teamIds: string[]) => {
    const ids = shuffle(teamIds.slice());
    const pairs: [string, string][] = [];
    while (ids.length >= 2) {
      const a = ids.shift()!;
      const b = ids.shift()!;
      pairs.push([a, b]);
    }
    // If odd, last team has a bye (ignored)
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
  };

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
    dispatch({ type: "UPDATE_MATCH", payload: updated });
  };

  const startPauseTimer = (matchId: string) => {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return;
    const updated: Match = {
      ...match,
      startedAt: match.startedAt ? null : Date.now(),
    };
    dispatch({ type: "UPDATE_MATCH", payload: updated });
  };

  const resetTimer = (matchId: string) => {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return;
    const updated: Match = {
      ...match,
      startedAt: null,
      remainingMs: 20 * 60 * 1000,
    };
    dispatch({ type: "UPDATE_MATCH", payload: updated });
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
    dispatch({ type: "UPDATE_MATCH", payload: updated });
  };

  const value = useMemo(
    () => ({ state, dispatch, drawTeams, generateMatches, updatePlayerStat, startPauseTimer, resetTimer, nextHalf }),
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
