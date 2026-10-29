import DashboardMainView from "@/components/dashboard/DashboardMainView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de Control | InHubFlow Social Selling",
  description:
    "Suite de Social Selling para LinkedIn: analítica en tiempo real, generador de contenido viral, monitoreo de señales y conversión del pipeline.",
};

export default function SocialSellingDashboardPage() {
  return <DashboardMainView />;
}
