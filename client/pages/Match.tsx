import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useApp } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  const { state, updatePlayerStat, startPauseTimer, resetTimer, nextHalf } = useApp();
  const match = state.matches.find((m) => m.id === matchId);

  const leftTeam = useMemo(() => state.teams.find((t) => t.id === match?.leftTeamId), [state.teams, match]);
  const rightTeam = useMemo(() => state.teams.find((t) => t.id === match?.rightTeamId), [state.teams, match]);

  const leftPlayers = useMemo(() => (match && leftTeam ? (state.assignments[leftTeam.id] || []).map((pid) => state.players.find((p) => p.id === pid)).filter(Boolean) : []), [match, leftTeam, state.assignments, state.players]) as NonNullable<ReturnType<typeof Array.prototype.map>>;
  const rightPlayers = useMemo(() => (match && rightTeam ? (state.assignments[rightTeam.id] || []).map((pid) => state.players.find((p) => p.id === pid)).filter(Boolean) : []), [match, rightTeam, state.assignments, state.players]) as NonNullable<ReturnType<typeof Array.prototype.map>>;

  if (!match || !leftTeam || !rightTeam) {
    return (
      <div className="container py-10">
        <div className="rounded-lg border bg-card p-6 text-center">Jogo não encontrado. <Link to="/" className="text-primary underline">Voltar</Link></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/70 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm">{match.phase}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{match.half}º tempo</Badge>
            <div className="font-mono text-2xl tabular-nums">{msToClock(match.remainingMs)}</div>
            <Button size="sm" onClick={() => startPauseTimer(match.id)}>{match.startedAt ? "Pausar" : "Iniciar"}</Button>
            <Button size="sm" variant="outline" onClick={() => resetTimer(match.id)}>Resetar</Button>
            <Button size="sm" variant="secondary" onClick={() => nextHalf(match.id)}>Próximo tempo</Button>
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

function TeamColumn({ title, color, players, matchId, update }: { title: string; color: string; players: any[]; matchId: string; update: (pid: string, fn: any) => void }) {
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
            <div className="rounded-md border p-4 text-sm text-muted-foreground">Sem escalação para este time. Faça o sorteio.</div>
          )}
          {players.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-muted text-xs font-semibold">{p.jerseyNumber}</span>
                <div>
                  <div className="font-medium leading-4">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.position}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={"outline"} onClick={() => update(p.id, (prev: any) => ({ ...prev, destaque: !prev.destaque }))}>{"Destaque"}</Button>
                <Button size="sm" onClick={() => update(p.id, (prev: any) => ({ ...prev, goals: prev.goals + 1 }))}>Gol +1</Button>
                <Button size="sm" variant="secondary" onClick={() => update(p.id, (prev: any) => ({ ...prev, yellow: Math.min(2, prev.yellow + 1) }))}>Amarelo</Button>
                <Button size="sm" variant="destructive" onClick={() => update(p.id, (prev: any) => ({ ...prev, red: !prev.red }))}>Vermelho</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
