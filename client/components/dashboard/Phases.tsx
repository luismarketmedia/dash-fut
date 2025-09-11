import { useMemo, useState } from "react";
import { useApp, Phase } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

const PHASES: Phase[] = ["Classificação", "Oitavas", "Quartas", "Semifinal", "Final"];

export function PhasesSection() {
  const { state, generateMatches } = useApp();
  const [phase, setPhase] = useState<Phase>("Classificação");
  const selectedTeamIds = useMemo(() => state.teams.map((t) => t.id), [state.teams]);

  const matchesByPhase = useMemo(() => {
    const groups: Record<Phase, typeof state.matches> = {
      Classificação: [], Oitavas: [], Quartas: [], Semifinal: [], Final: [],
    };
    for (const m of state.matches) groups[m.phase].push(m);
    return groups;
  }, [state.matches]);

  return (
    <section id="fases" className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Fases do Campeonato</h2>
          <p className="text-muted-foreground text-sm">Sorteie confrontos automáticos entre os times.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={phase} onValueChange={(v) => setPhase(v as Phase)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PHASES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => generateMatches(phase, selectedTeamIds)} disabled={state.teams.length < 2}>Sortear confrontos</Button>
        </div>
      </header>

      <div className="space-y-8">
        {PHASES.map((p) => (
          <div key={p}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-medium">{p}</h3>
              <Badge variant="secondary">{matchesByPhase[p].length} jogos</Badge>
            </div>
            <Separator />
            {matchesByPhase[p].length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground">Nenhum confronto ainda.</div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matchesByPhase[p].map((m) => {
                  const lt = state.teams.find((t) => t.id === m.leftTeamId);
                  const rt = state.teams.find((t) => t.id === m.rightTeamId);
                  if (!lt || !rt) return null;
                  return (
                    <Card key={m.id} className="overflow-hidden border-0 shadow-sm">
                      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${lt.color}, ${rt.color})` }} />
                      <CardHeader>
                        <CardTitle className="text-base">{lt.name} vs {rt.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <Badge style={{ backgroundColor: lt.color, color: "#000" }}>Esq.</Badge>
                        <Link to={`/jogo/${m.id}`} className="text-primary underline">Abrir jogo</Link>
                        <Badge style={{ backgroundColor: rt.color, color: "#000" }}>Dir.</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
