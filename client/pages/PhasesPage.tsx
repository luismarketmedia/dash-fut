import { DashboardLayout } from "@/components/dashboard/Layout";
import { PhasesSection } from "@/components/dashboard/Phases";
import { TopScorersSection } from "@/components/dashboard/TopScorers";

export default function PhasesPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Fases do Campeonato</h1>
        <p className="text-muted-foreground">Sorteie confrontos por fase entre os times.</p>
      </div>
      <PhasesSection />
      <TopScorersSection />
    </DashboardLayout>
  );
}
