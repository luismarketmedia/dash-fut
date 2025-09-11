import { DashboardLayout } from "@/components/dashboard/Layout";
import { useApp } from "@/store/app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function Index() {
  const { state } = useApp();
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Organize seu campeonato</h1>
        <p className="text-muted-foreground">Escolha uma seção para começar.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <HomeTile to="/jogadores" title="Jogadores" count={state.players.length} subtitle="Cadastrar e gerenciar" />
        <HomeTile to="/times" title="Times" count={state.teams.length} subtitle="Criar e editar" />
        <HomeTile to="/sorteio" title="Sorteio" count={Object.values(state.assignments).reduce((a,b)=>a+(b?.length||0),0)} subtitle="Distribuir jogadores" />
        <HomeTile to="/fases" title="Fases" count={state.matches.length} subtitle="Sorteio de confrontos" />
      </div>
    </DashboardLayout>
  );
}

function HomeTile({ to, title, count, subtitle }: { to: string; title: string; count: number; subtitle: string }) {
  return (
    <Link to={to} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Badge variant="secondary">{count}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{subtitle}</CardContent>
      </Card>
    </Link>
  );
}
