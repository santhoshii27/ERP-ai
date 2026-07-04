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
export interface Warehouse {
  id: string;
  name: string;
  city: string;
  address: string;
}

export interface StockItemWithWarehouse {
  id: string;
  quantity: number;
  warehouse: Warehouse;
  batchNumber: string | null;
  rackNumber: string | null;
  expiryDate: string | null;
}

export interface ScannedProduct {
  id: string;
  name: string;
  barcode: string;
  hsnCode: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  gstPercent: number;
  reorderLevel: number;
  category: { name: string };
  supplier: { name: string };
  stockItems: StockItemWithWarehouse[];
}
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string;
}

export interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  sellingPrice: number;
  gstPercent: number;
  quantity: number;
}

export interface SaleItemResult {
  id: string;
  quantity: number;
  unitPrice: number;
  gstAmount: number;
  product: { name: string; hsnCode: string };
}

export interface SaleResult {
  id: string;
  invoiceNo: string;
  totalAmount: number;
  gstAmount: number;
  paymentMode: string;
  createdAt: string;
  items: SaleItemResult[];
  customer: Customer | null;
}