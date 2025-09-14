import React, { useMemo, useState, useEffect } from "react";
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
import { Pencil, Trash2 } from "lucide-react";

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
  const [pos, setPos] = useState<"ALL" | Position>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byText = !q
      ? state.players
      : state.players.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            String(p.jerseyNumber).includes(q) ||
            p.position.toLowerCase().includes(q),
        );
    const byPos = pos === "ALL" ? byText : byText.filter((p) => p.position === pos);
    return byPos.slice().sort((a, b) => a.jerseyNumber - b.jerseyNumber);
  }, [state.players, query, pos]);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, número ou posição"
            className="w-full sm:w-64"
          />
          <Select value={pos} onValueChange={(v) => setPos(v as any)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todas as posições" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as posições</SelectItem>
              {POSITIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline">Total: {state.players.length}</Badge>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Posição</TableHead>
              <TableHead className="hidden sm:table-cell">Pago</TableHead>
              <TableHead className="w-20 text-right sm:w-24">Ações</TableHead>
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
  const [jerseyEdit, setJerseyEdit] = useState<number>(player.jerseyNumber);

  // Keep inline state in sync if global changes
  useEffect(() => {
    setJerseyEdit(player.jerseyNumber);
    setForm(player);
  }, [player]);

  const commitJerseyIfChanged = () => {
    const newNumber = Number.isFinite(jerseyEdit) ? jerseyEdit : 0;
    if (newNumber !== player.jerseyNumber) {
      dispatch({
        type: "UPDATE_PLAYER",
        payload: { ...player, jerseyNumber: Math.max(0, newNumber) },
      });
    }
  };

  const togglePaid = (paid: boolean) => {
    if (paid !== player.paid) {
      dispatch({ type: "UPDATE_PLAYER", payload: { ...player, paid } });
    }
  };

  const onSave = () => {
    dispatch({ type: "UPDATE_PLAYER", payload: form });
    setOpen(false);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Input
          type="number"
          min={0}
          value={jerseyEdit}
          onChange={(e) => setJerseyEdit(parseInt(e.target.value || "0"))}
          onBlur={commitJerseyIfChanged}
          className="h-8 w-16 text-center sm:w-20"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="truncate">{player.name}</span>
          <span className="sm:hidden">
            <Badge variant="secondary">{player.position}</Badge>
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="secondary">{player.position}</Badge>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`paid-inline-${player.id}`}
            checked={player.paid}
            onCheckedChange={(v) => togglePaid(!!v)}
          />
          <label htmlFor={`paid-inline-${player.id}`} className="text-xs">
            Pago
          </label>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 sm:h-10 sm:w-10">
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
          <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 sm:h-10 sm:w-10">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
