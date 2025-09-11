import { useMemo, useState } from "react";
import { useApp, Player, Position } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";

const POSITIONS: Position[] = [
  "GOL",
  "FIXO",
  "MEIO",
  "ALA DIREITA",
  "ALA ESQUERDA",
  "FRENTE",
];

export function PlayersSection() {
  return (
    <section id="jogadores" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cadastro de Jogadores</h2>
          <p className="text-muted-foreground text-sm">
            Adicione, edite e gerencie os jogadores.
          </p>
        </div>
      </header>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <PlayerForm />
        </div>
        <div className="md:col-span-2">
          <PlayerTable />
        </div>
      </div>
    </section>
  );
}

function PlayerForm() {
  const { dispatch } = useApp();
  const [jerseyNumber, setJerseyNumber] = useState<number>(0);
  const [name, setName] = useState("");
  const [position, setPosition] = useState<Position>("GOL");
  const [paid, setPaid] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({
      type: "ADD_PLAYER",
      payload: {
        jerseyNumber: Number(jerseyNumber) || 0,
        name: name.trim(),
        position,
        paid,
      },
    });
    setJerseyNumber(0);
    setName("");
    setPosition("GOL");
    setPaid(false);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
    >
      <div className="grid gap-3">
        <label className="text-sm font-medium">Número da camisa</label>
        <Input
          type="number"
          min={0}
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(parseInt(e.target.value || "0"))}
        />
      </div>
      <div className="grid gap-3">
        <label className="text-sm font-medium">Nome</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: João Silva"
        />
      </div>
      <div className="grid gap-3">
        <label className="text-sm font-medium">Posição</label>
        <Select
          value={position}
          onValueChange={(v) => setPosition(v as Position)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="paid"
          checked={paid}
          onCheckedChange={(v) => setPaid(!!v)}
        />
        <label htmlFor="paid" className="text-sm">
          Pago
        </label>
      </div>
      <Button type="submit" className="w-full">
        Adicionar
      </Button>
    </form>
  );
}

function PlayerTable() {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? state.players
      : state.players.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            String(p.jerseyNumber).includes(q) ||
            p.position.toLowerCase().includes(q),
        );
    return base.slice().sort((a, b) => a.jerseyNumber - b.jerseyNumber);
  }, [state.players, query]);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, número ou posição"
        />
        <Badge variant="outline">Total: {state.players.length}</Badge>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Posição</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                onDelete={() =>
                  dispatch({ type: "DELETE_PLAYER", payload: { id: p.id } })
                }
              />
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-sm text-muted-foreground"
                >
                  Nenhum jogador
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  onDelete,
}: {
  player: Player;
  onDelete: () => void;
}) {
  const { dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Player>(player);

  const paidIcon = player.paid ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  ) : (
    <Circle className="h-4 w-4 text-muted-foreground" />
  );

  const onSave = () => {
    dispatch({ type: "UPDATE_PLAYER", payload: form });
    setOpen(false);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{player.jerseyNumber}</TableCell>
      <TableCell>{player.name}</TableCell>
      <TableCell>
        <Badge variant="secondary">{player.position}</Badge>
      </TableCell>
      <TableCell>{paidIcon}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Jogador</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <label className="text-sm">Número</label>
                <Input
                  type="number"
                  value={form.jerseyNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      jerseyNumber: parseInt(e.target.value || "0"),
                    })
                  }
                />
                <label className="text-sm">Nome</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <label className="text-sm">Posição</label>
                <Select
                  value={form.position}
                  onValueChange={(v) =>
                    setForm({ ...form, position: v as Position })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id={`paid-${player.id}`}
                    checked={form.paid}
                    onCheckedChange={(v) => setForm({ ...form, paid: !!v })}
                  />
                  <label htmlFor={`paid-${player.id}`} className="text-sm">
                    Pago
                  </label>
                </div>
                <Button onClick={onSave}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
