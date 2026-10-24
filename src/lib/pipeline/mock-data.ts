import { PipelineDeal, PipelineStageConfig } from "./types";

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    id: "lead_captured",
    name: "1. Lead Captado",
    order: 1,
    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    headerBorder: "border-t-gray-400",
  },
  {
    id: "in_sequence",
    name: "2. En Secuencia",
    order: 2,
    badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    headerBorder: "border-t-blue-500",
  },
  {
    id: "connected_material_sent",
    name: "3. Conectado / Material",
    order: 3,
    badgeColor: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    headerBorder: "border-t-cyan-500",
  },
  {
    id: "interested",
    name: "4. Conversacion / Interesado",
    order: 4,
    badgeColor: "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300",
    headerBorder: "border-t-brand-500",
  },
  {
    id: "meeting_scheduled",
    name: "5. Reunion Agendada",
    order: 5,
    badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    headerBorder: "border-t-purple-500",
  },
  {
    id: "proposal_sent",
    name: "6. Propuesta Presentada",
    order: 6,
    badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    headerBorder: "border-t-amber-500",
  },
  {
    id: "closed_won",
    name: "7. Ganado (Closed Won)",
    order: 7,
    badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    headerBorder: "border-t-emerald-500",
  },
];

export const INITIAL_DEALS: PipelineDeal[] = [];
