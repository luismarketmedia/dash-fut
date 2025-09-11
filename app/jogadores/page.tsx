"use client";
import { DashboardLayout } from "@/components/dashboard/Layout";
import { PlayersSection } from "@/components/dashboard/Players";

export default function JogadoresPage() {
  return (
    <DashboardLayout>
      <PlayersSection />
    </DashboardLayout>
  );
}
