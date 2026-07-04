export interface AiAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  explanation: string;
  suggestedAction: string;
  status: string;
  createdAt: string;
}

export interface DashboardSummary {
  todaysRevenue: number;
  todaysOrderCount: number;
  totalRevenue: number;
  totalProfit: number;
  inventoryValue: number;
  lowStockCount: number;
  expiringCount: number;
  pendingPOs: number;
  topProducts: { name: string; qty: number }[];
  leastProducts: { name: string; qty: number }[];
  aiAlerts: AiAlert[];
  revenueTrend: { date: string; revenue: number }[];
}