import type { Shift, Product, Role } from '../../features/retail/api';
import type { KioscoSale } from '../../types/kiosco';
import type { MarginSummary as MarginSummaryData } from '../../features/retail/marginAnalytics';

export type PeriodType = "today" | "7days" | "month";
export type AIReportStatus = "idle" | "loading" | "streaming" | "done" | "error";

export interface AIReportPanelProps {
  shifts: Shift[];
  allSales: KioscoSale[];
  products: Product[];
  storeName: string;
  role?: Role | string;
  storeId?: string;
}

export interface PeriodCalculations {
  separation: MarginSummaryData;
  period: PeriodType;
  periodLabel: string;
  totalRevenue: number;
  totalSalesCount: number;
  averageTicket: number;
  totalUnitsSold: number;
  paymentDistribution: {
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  topProducts: {
    name: string;
    qty: number;
    subtotal: number;
  }[];
  shiftsCount: number;
  estimatedMargin?: {
    totalCost: number;
    profit: number;
    marginPercent: number;
  };
}
