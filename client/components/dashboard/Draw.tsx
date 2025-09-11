import { useApp } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DrawSection() {
  const { state, drawTeams } = useApp();
  const { teams, assignments, players } = state;

  return (
    <section id="sorteio" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Sorteio de Times</h2>
          <p className="text-muted-foreground text-sm">Primeiro distribui goleiros, depois equilibra os demais.</p>
        </div>
        <Button onClick={drawTeams} disabled={teams.length === 0 || players.length === 0}>Sortear</Button>
      </header>
      {teams.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">Crie times e cadastre jogadores para realizar o sorteio.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const ids = assignments[t.id] || [];
            return (
              <Card key={t.id} className="overflow-hidden border-0 shadow-sm">
                <div className="h-2 w-full" style={{ backgroundColor: t.color }} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <Badge variant="secondary">{ids.length}/{t.capacity}</Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48 pr-3">
                    <ul className="space-y-2">
                      {ids.map((pid) => {
                        const p = players.find((pp) => pp.id === pid);
                        if (!p) return null;
                        return (
                          <li key={pid} className="flex items-center justify-between rounded-md border p-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-semibold">{p.jerseyNumber}</span>
                              <div>
                                <div className="font-medium leading-4">{p.name}</div>
                                <div className="text-xs text-muted-foreground">{p.position}</div>
                              </div>
                            </div>
                            {p.paid ? (
                              <Badge className="bg-emerald-500 hover:bg-emerald-500">Pago</Badge>
                            ) : (
                              <Badge variant="outline">Pendente</Badge>
                            )}
                          </li>
                        );
                      })}
                      {ids.length === 0 && (
                        <li className="text-center text-sm text-muted-foreground">Sem jogadores atribuídos</li>
                      )}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
