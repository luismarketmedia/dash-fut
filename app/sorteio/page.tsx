"use client";
import { DashboardLayout } from "@/components/dashboard/Layout";
import { DrawSection } from "@/components/dashboard/Draw";

export default function SorteioPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Sorteio de Times</h1>
        <p className="text-muted-foreground">Distribua goleiros e equilibre os demais jogadores entre os times.</p>
      </div>
      <DrawSection />
    </DashboardLayout>
  );
}
