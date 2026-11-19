import DashboardMainView from "@/components/dashboard/DashboardMainView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "InhubFlow | AI-Powered Social Selling Assistant",
  },
  description:
    "Asistente SDR IA de Social Selling para LinkedIn: analítica en tiempo real, generador de contenido viral, monitoreo de señales y conversión del pipeline.",
};

export default function SocialSellingDashboardPage() {
  return <DashboardMainView />;
}
