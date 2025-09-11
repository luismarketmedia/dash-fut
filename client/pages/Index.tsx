import { DashboardLayout } from "@/components/dashboard/Layout";
import { PlayersSection } from "@/components/dashboard/Players";
import { TeamsSection } from "@/components/dashboard/Teams";
import { DrawSection } from "@/components/dashboard/Draw";
import { PhasesSection } from "@/components/dashboard/Phases";

export default function Index() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Organize seu campeonato</h1>
        <p className="text-muted-foreground">Cadastre jogadores e times, sorteie e acompanhe as partidas.</p>
      </div>
      <div className="space-y-12">
        <PlayersSection />
        <TeamsSection />
        <DrawSection />
        <PhasesSection />
      </div>
    </DashboardLayout>
  );
}
