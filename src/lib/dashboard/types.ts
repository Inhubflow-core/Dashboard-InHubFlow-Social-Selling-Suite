import type { Lead360Item } from "@/lib/leads/types";
import type { PipelineDeal, PipelineStageId } from "@/lib/pipeline/types";

export interface DashboardMetricOverview {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  activeDeals: number;
  scheduledMeetings: number;
  closedWon: number;
  conversionRate: number;
  activeCampaigns: number;
  queuedPosts: number;
  connectedAccounts: number;
}

export interface SignalDistributionData {
  level1Count: number;
  level2Count: number;
  level3Count: number;
  total: number;
}

export interface FunnelStageData {
  id: PipelineStageId;
  label: string;
  count: number;
  color: string;
}

export interface EvolutionChartSeries {
  name: string;
  data: number[];
  color: string;
}

export interface EvolutionData {
  categories: string[];
  series: EvolutionChartSeries[];
}

export interface DashboardAnalytics {
  overview: DashboardMetricOverview;
  signalDistribution: SignalDistributionData;
  funnelStages: FunnelStageData[];
  evolutionMonthly: EvolutionData;
  evolutionWeekly: EvolutionData;
  recentLeads: Lead360Item[];
  pipelineDeals: PipelineDeal[];
}
