"use client";
import { DashboardLayout } from "@/components/dashboard/Layout";
import { PlayersSection } from "@/components/dashboard/Players";

export default function JogadoresPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Cadastro de Jogadores
        </h1>
        <p className="text-muted-foreground">
          Adicione, edite e gerencie os jogadores.
        </p>
      </div>
      <PlayersSection />
    </DashboardLayout>
  );
}
