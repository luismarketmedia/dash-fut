import { useMemo } from "react";
import { useApp } from "@/store/app";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export function StandingsSection() {
  const { state } = useApp();

  const rows = useMemo(() => {
    const stats = new Map<string, { teamId: string; name: string; color: string; P: number; V: number; E: number; D: number; GF: number; GA: number; SG: number; Pts: number }>();
    for (const t of state.teams) {
      stats.set(t.id, { teamId: t.id, name: t.name, color: t.color, P: 0, V: 0, E: 0, D: 0, GF: 0, GA: 0, SG: 0, Pts: 0 });
    }
    const goalsFor = (teamId: string, match: typeof state.matches[number]) => {
      const ids = state.assignments[teamId] || [];
      let s = 0;
      for (const pid of ids) {
        const ev = match.events[pid];
        if (ev) s += ev.goals;
      }
      return s;
    };

    for (const m of state.matches) {
      const lt = stats.get(m.leftTeamId);
      const rt = stats.get(m.rightTeamId);
      if (!lt || !rt) continue;
      const lg = goalsFor(lt.teamId, m);
      const rg = goalsFor(rt.teamId, m);
      lt.P++; rt.P++;
      lt.GF += lg; lt.GA += rg;
      rt.GF += rg; rt.GA += lg;
      if (lg > rg) { lt.V++; lt.Pts += 3; rt.D++; }
      else if (lg < rg) { rt.V++; rt.Pts += 3; lt.D++; }
      else { lt.E++; rt.E++; lt.Pts += 1; rt.Pts += 1; }
    }

    for (const s of stats.values()) s.SG = s.GF - s.GA;

    const arr = Array.from(stats.values());
    arr.sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GF - a.GF || a.name.localeCompare(b.name));
    return arr;
  }, [state.matches, state.assignments, state.teams]);

  if (state.teams.length === 0) return null;

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="border-b p-4 text-lg font-semibold">Classificação</div>
      <div className="overflow-x-auto p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>P</TableHead>
              <TableHead>V</TableHead>
              <TableHead>E</TableHead>
              <TableHead>D</TableHead>
              <TableHead>GF</TableHead>
              <TableHead>GS</TableHead>
              <TableHead>SG</TableHead>
              <TableHead>Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.teamId}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: r.color }} />
                    {r.name}
                  </span>
                </TableCell>
                <TableCell>{r.P}</TableCell>
                <TableCell>{r.V}</TableCell>
                <TableCell>{r.E}</TableCell>
                <TableCell>{r.D}</TableCell>
                <TableCell>{r.GF}</TableCell>
                <TableCell>{r.GA}</TableCell>
                <TableCell>{r.SG}</TableCell>
                <TableCell className="font-semibold">{r.Pts}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
