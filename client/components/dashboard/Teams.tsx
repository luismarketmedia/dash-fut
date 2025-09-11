import { useState } from "react";
import { useApp, Team } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { StandingsSection } from "./Standings";

function ColorPreview({ color }: { color: string }) {
  return <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: color }} />;
}

export function TeamsSection() {
  return (
    <section id="times" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cadastro de Times</h2>
          <p className="text-muted-foreground text-sm">Crie times, defina cor e capacidade.</p>
        </div>
      </header>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <TeamForm />
        </div>
        <div className="md:col-span-2">
          <TeamCards />
        </div>
      </div>
      <StandingsSection />
    </section>
  );
}

function TeamForm() {
  const { dispatch } = useApp();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [capacity, setCapacity] = useState(8);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({ type: "ADD_TEAM", payload: { name: name.trim(), color, capacity } });
    setName("");
    setColor("#22c55e");
    setCapacity(8);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Nome do time</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Panteras" />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Cor do time</label>
        <div className="flex items-center gap-3">
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 p-1" />
          <ColorPreview color={color} />
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Quantidade de jogadores</label>
        <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value || "1"))} />
      </div>
      <Button type="submit" className="w-full">Criar time</Button>
    </form>
  );
}

function TeamCards() {
  const { state, dispatch } = useApp();
  const { assignments } = state;

  if (state.teams.length === 0) {
    return <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">Nenhum time criado</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {state.teams.map((t) => (
        <TeamCard key={t.id} team={t} assignedCount={assignments[t.id]?.length || 0} onDelete={() => dispatch({ type: "DELETE_TEAM", payload: { id: t.id } })} />
      ))}
    </div>
  );
}

function TeamCard({ team, assignedCount, onDelete }: { team: Team; assignedCount: number; onDelete: () => void }) {
  const { dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Team>(team);

  const onSave = () => {
    dispatch({ type: "UPDATE_TEAM", payload: form });
    setOpen(false);
  };

  return (
    <Card className="overflow-hidden border-0 shadow-sm" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
      <div className="h-2 w-full" style={{ backgroundColor: team.color }} />
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold" style={{ backgroundColor: team.color + "22", color: team.color }}>
              {team.name.slice(0, 1).toUpperCase()}
            </span>
            {team.name}
          </div>
          <Badge variant="secondary">{assignedCount}/{team.capacity}</Badge>
        </CardTitle>
        <CardDescription>Capacidade definida: {team.capacity} jogadores</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-end gap-2 pt-0">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Time</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <label className="text-sm">Nome</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <label className="text-sm">Cor</label>
              <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-20 p-1" />
              <label className="text-sm">Quantidade</label>
              <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value || "1") })} />
              <Button onClick={onSave}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </CardContent>
    </Card>
  );
}
