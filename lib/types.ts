export interface Product {
  id: number;
  name: string;
  category: string;
  cost_price: number | string;
  selling_price: number | string;
  quantity_in_stock: number;
  reorder_level: number;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface SaleItemOut {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
  line_profit: number | string;
}

export interface Sale {
  id: number;
  customer_id: number | null;
  customer_name: string | null;
  sale_date: string;
  total_amount: number | string;
  total_profit: number | string;
  items: SaleItemOut[];
}

export interface Purchase {
  id: number;
  supplier_id: number;
  supplier_name: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_cost: number | string;
  purchase_date: string;
}

export interface DashboardSummary {
  todays_sales: number | string;
  products_sold_today: number;
  low_stock_count: number;
  total_customers: number;
}

export interface MonthlyProductSales {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: number | string;
}

export interface CustomerHistoryItem {
  sale_id: number;
  sale_date: string;
  total_amount: number | string;
  items_count: number;
}

export interface CustomerHistory {
  customer_id: number;
  customer_name: string;
  total_spent: number | string;
  sales_count: number;
  sales: CustomerHistoryItem[];
}

export interface Shortage {
  product_id: number;
  product_name: string;
  requested: number;
  available: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_approved: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}
