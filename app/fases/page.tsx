"use client";
import { DashboardLayout } from "@/components/dashboard/Layout";
import { PhasesSection } from "@/components/dashboard/Phases";
import { TopScorersSection } from "@/components/dashboard/TopScorers";

export default function FasesPage() {
  return (
    <DashboardLayout>
      <PhasesSection />
      <TopScorersSection />
    </DashboardLayout>
  );
}
