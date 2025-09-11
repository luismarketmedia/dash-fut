import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useApp } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Star, Plus, Minus, Square } from "lucide-react";

function msToClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function Match() {
  const { matchId } = useParams();
  const { state, updatePlayerStat, startPauseTimer, resetTimer, nextHalf } =
    useApp();
  const match = state.matches.find((m) => m.id === matchId);

  const leftTeam = useMemo(
    () => state.teams.find((t) => t.id === match?.leftTeamId),
    [state.teams, match],
  );
  const rightTeam = useMemo(
    () => state.teams.find((t) => t.id === match?.rightTeamId),
    [state.teams, match],
  );

  const leftPlayers = useMemo(
    () =>
      match && leftTeam
        ? (state.assignments[leftTeam.id] || [])
            .map((pid) => state.players.find((p) => p.id === pid))
            .filter(Boolean)
        : [],
    [match, leftTeam, state.assignments, state.players],
  ) as NonNullable<ReturnType<typeof Array.prototype.map>>;
  const rightPlayers = useMemo(
    () =>
      match && rightTeam
        ? (state.assignments[rightTeam.id] || [])
            .map((pid) => state.players.find((p) => p.id === pid))
            .filter(Boolean)
        : [],
    [match, rightTeam, state.assignments, state.players],
  ) as NonNullable<ReturnType<typeof Array.prototype.map>>;

  if (!match || !leftTeam || !rightTeam) {
    return (
      <div className="container py-10">
        <div className="rounded-lg border bg-card p-6 text-center">
          Jogo não encontrado.{" "}
          <Link to="/" className="text-primary underline">
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  const score = (teamId: string) => {
    const ids = state.assignments[teamId] || [];
    let s = 0;
    for (const pid of ids) {
      const ev = match.events[pid];
      if (ev) s += ev.goals;
    }
    return s;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/70 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm">{match.phase}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-2 md:flex">
              <span className="font-medium" style={{ color: leftTeam.color }}>
                {leftTeam.name}
              </span>
              <span className="font-mono text-xl">
                {score(leftTeam.id)} - {score(rightTeam.id)}
              </span>
              <span className="font-medium" style={{ color: rightTeam.color }}>
                {rightTeam.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{match.half}º tempo</Badge>
              <div className="font-mono text-2xl tabular-nums">
                {msToClock(match.remainingMs)}
              </div>
              <Button size="sm" onClick={() => startPauseTimer(match.id)}>
                {match.startedAt ? "Pausar" : "Iniciar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resetTimer(match.id)}
              >
                Resetar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => nextHalf(match.id)}
              >
                Próximo tempo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid gap-6 md:grid-cols-2">
          <TeamColumn
            title={`${leftTeam.name}`}
            color={leftTeam.color}
            players={leftPlayers as any}
            matchId={match.id}
            update={(pid, fn) => updatePlayerStat(match.id, pid, fn)}
          />
          <TeamColumn
            title={`${rightTeam.name}`}
            color={rightTeam.color}
            players={rightPlayers as any}
            matchId={match.id}
            update={(pid, fn) => updatePlayerStat(match.id, pid, fn)}
          />
        </div>
      </div>
    </div>
  );
}

function TeamColumn({
  title,
  color,
  players,
  matchId,
  update,
}: {
  title: string;
  color: string;
  players: any[];
  matchId: string;
  update: (pid: string, fn: any) => void;
}) {
  const { state, dispatch, setUniqueDestaque } = useApp();
  const events = state.matches.find((m) => m.id === matchId)?.events || {};
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <div className="h-2 w-full" style={{ backgroundColor: color }} />
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge style={{ backgroundColor: color, color: "#000" }}>Cor</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {players.length === 0 && (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              Sem escalação para este time. Faça o sorteio.
            </div>
          )}
          {players.map((p: any) => {
            const s = events[p.id] || {
              goals: 0,
              yellow: 0,
              red: false,
              destaque: false,
            };
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    className="h-8 w-16 text-center"
                    value={p.jerseyNumber}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_PLAYER",
                        payload: {
                          ...p,
                          jerseyNumber: parseInt(e.target.value || "0"),
                        },
                      })
                    }
                  />
                  <div>
                    <div className="font-medium leading-4 flex items-center gap-2">
                      <span>{p.name}</span>
                      {s.destaque && (
                        <Star className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.position}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        update(p.id, (prev: any) => ({
                          ...prev,
                          goals: Math.max(0, prev.goals - 1),
                        }))
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Badge variant="secondary" className="gap-1">
                      <CircleDotIcon />
                      {s.goals}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        update(p.id, (prev: any) => ({
                          ...prev,
                          goals: prev.goals + 1,
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        update(p.id, (prev: any) => ({
                          ...prev,
                          yellow: Math.max(0, prev.yellow - 1),
                        }))
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Badge className="gap-1 bg-yellow-400 hover:bg-yellow-400 text-black">
                      <Square className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {s.yellow}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        update(p.id, (prev: any) => ({
                          ...prev,
                          yellow: prev.yellow + 1,
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant={s.red ? "destructive" : "outline"}
                    onClick={() =>
                      update(p.id, (prev: any) => ({ ...prev, red: !prev.red }))
                    }
                  >
                    <Square
                      className={
                        s.red ? "h-4 w-4 fill-red-500 text-red-500" : "h-4 w-4"
                      }
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant={"outline"}
                    onClick={() => setUniqueDestaque(matchId, p.id)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CircleDotIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}
