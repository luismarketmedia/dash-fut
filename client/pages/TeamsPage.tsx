import { DashboardLayout } from "@/components/dashboard/Layout";
import { TeamsSection } from "@/components/dashboard/Teams";

export default function TeamsPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Cadastro de Times</h1>
        <p className="text-muted-foreground">Crie times, defina cor e capacidade.</p>
      </div>
      <TeamsSection />
    </DashboardLayout>
  );
}
