import { useMemo } from "react";
import { useApp } from "@/store/app";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export function TopScorersSection() {
  const { state } = useApp();

  const rows = useMemo(() => {
    const totals = new Map<
      string,
      {
        playerId: string;
        name: string;
        teamName: string;
        teamColor: string;
        goals: number;
      }
    >();
    const teamOf = (pid: string) => {
      for (const [tid, ids] of Object.entries(state.assignments)) {
        if (ids.includes(pid))
          return state.teams.find((t) => t.id === tid) || null;
      }
      return null;
    };
    for (const m of state.matches) {
      for (const [pid, ev] of Object.entries(m.events)) {
        const pl = state.players.find((p) => p.id === pid);
        if (!pl) continue;
        const team = teamOf(pid);
        const k = pid;
        const cur = totals.get(k) || {
          playerId: pid,
          name: pl.name,
          teamName: team?.name || "-",
          teamColor: team?.color || "#999",
          goals: 0,
        };
        cur.goals += ev.goals;
        totals.set(k, cur);
      }
    }
    const arr = Array.from(totals.values());
    arr.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
    return arr.slice(0, 20);
  }, [state.matches, state.players, state.assignments, state.teams]);

  if (rows.length === 0) return null;

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="border-b p-4 text-lg font-semibold">Artilharia</div>
      <div className="overflow-x-auto p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Jogador</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Gols</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.playerId}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: r.teamColor }}
                    />
                    {r.teamName}
                  </span>
                </TableCell>
                <TableCell className="font-semibold">{r.goals}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
