import { useMemo, useState } from "react";
import { useApp, Phase } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const PHASES: Phase[] = [
  "Classificação",
  "Oitavas",
  "Quartas",
  "Semifinal",
  "Final",
];

const MATCHES_PER_WEEK = 3;

export function PhasesSection() {
  const { state, generateMatches } = useApp();
  const [phase, setPhase] = useState<Phase>("Classificação");

  const selectedTeamIds = useMemo(
    () => state.teams.map((t) => t.id),
    [state.teams],
  );

  const indexMap = useMemo(() => {
    const map = new Map<string, number>();
    state.matches.forEach((m, i) => map.set(m.id, i));
    return map;
  }, [state.matches]);

  const matchesByPhase = useMemo(() => {
    const groups: Record<Phase, typeof state.matches> = {
      Classificação: [],
      Oitavas: [],
      Quartas: [],
      Semifinal: [],
      Final: [],
    };
    for (const m of state.matches) groups[m.phase].push(m);
    // Keep original insertion order per phase
    for (const p of PHASES) {
      groups[p].sort((a, b) => (indexMap.get(a.id)! - indexMap.get(b.id)!));
    }
    return groups;
  }, [state.matches, indexMap]);

  const packWeeks = (arr: typeof state.matches) => {
    const weeks: typeof state.matches[] = [];
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
          <Button
            onClick={() => generateMatches(phase, selectedTeamIds)}
            disabled={state.teams.length < 2}
          >
            Sortear confrontos
          </Button>
        </div>
      </header>

      <div className="space-y-8">
        {PHASES.map((p) => {
          const matches = matchesByPhase[p];
          const weeks = chunkWeeks(matches);
          return (
            <div key={p}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-medium">{p}</h3>
                <Badge variant="secondary">{matches.length} jogos</Badge>
              </div>
              <Separator />
              {matches.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">
                  Nenhum confronto ainda.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {weeks.map((wk, idx) => (
                    <Card key={`${p}-week-${idx + 1}`} className="overflow-hidden border-0 shadow-sm">
                      <div className="border-b p-4 flex items-center justify-between">
                        <div className="font-semibold">Semana {idx + 1}</div>
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
                              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate" style={{ color: lt.color }}>{lt.name}</span>
                                  <span className="font-mono">{ls} x {rs}</span>
                                  <span className="font-medium truncate" style={{ color: rt.color }}>{rt.name}</span>
                                </div>
                                <Link href={`/jogo/${m.id}`} className="text-primary underline whitespace-nowrap">Abrir jogo</Link>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
