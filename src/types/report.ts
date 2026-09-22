export interface OrderItemInput {
  id?: string;
  productName: string;
  category: "Coffee" | "Non-Coffee" | "Food" | "Pastry" | "Sales Item" | "Lainnya";
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface OrderInput {
  id?: string;
  orderNumber: string;
  orderDate?: string;
  customerName?: string;
  tableNumber?: string;
  orderType: "Dine In" | "Take Away" | "Delivery";
  paymentMethod: "CASH" | "QRIS" | "DEBIT" | "CREDIT" | "ONLINE_FOOD" | "TRANSFER";
  subtotal: number;
  discount: number;
  tax?: number;
  totalAmount: number;
  status: "COMPLETED" | "VOID" | "REFUND";
  cashierName: string;
  items: OrderItemInput[];
}

export interface ExpenseInput {
  id?: string;
  description: string;
  category: "Operasional" | "Bahan Baku" | "Transport" | "Kebersihan" | "Lainnya";
  amount: number;
}

export interface DailyReportFormData {
  reportDate: string; // YYYY-MM-DD
  branchName: string;
  businessType: "FnB" | "Sales" | "Retail";
  shift: "Pagi" | "Siang" | "Malam" | "Full Day";
  staffName: string;

  // Sales
  grossSales: number;
  discountTotal: number;
  taxAndService: number;
  totalTransactions: number;
  customerCount: number;

  // Payments
  cashSales: number;
  qrisSales: number;
  debitCardSales: number;
  creditCardSales: number;
  onlineDelivery: number;
  transferSales: number;

  // Cash Balancing
  openingCashFloat: number;
  actualCashInDrawer: number;
  differenceReason?: string;

  // Operational notes
  operationalNotes?: string;

  // Relations
  expenseItems: ExpenseInput[];
  orders?: OrderInput[];
}

export interface DailyReportRecord extends DailyReportFormData {
  id: string;
  netSales: number;
  totalExpenses: number;
  expectedCash: number;
  cashDifference: number;
  status: "DRAFT" | "COMPLETED" | "VERIFIED";
  verifiedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KPIStats {
  todayGrossSales: number;
  todayNetSales: number;
  todayCashCollected: number;
  todayExpenses: number;
  todayTransactions: number;
  todayPax: number;
  cashDiscrepancyCount: number;
  paymentSplit: {
    name: string;
    value: number;
    color: string;
  }[];
}
