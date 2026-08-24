import type {
  Customer,
  CustomerHistory,
  DashboardSummary,
  MonthlyProductSales,
  Product,
  Purchase,
  Sale,
  Supplier,
} from "./types";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }

  get shortages(): Array<{ product_id: number; product_name: string; requested: number; available: number }> {
    const d = this.detail as { detail?: { shortages?: unknown } } | null;
    const s = d?.detail?.shortages;
    return Array.isArray(s) ? (s as never) : [];
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, null, "Cannot reach the server. Is the backend running?");
  }
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    throw new ApiError(res.status, body, extractMessage(res.statusText, body));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function extractMessage(fallback: string, body: unknown): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    const inner = (obj.detail ?? obj) as Record<string, unknown> | undefined;
    if (inner && typeof inner === "object") {
      if (typeof inner.message === "string") return inner.message;
      if (typeof inner.detail === "string") return inner.detail;
    }
    if (typeof obj.detail === "string") return obj.detail;
  }
  return fallback || "Request failed";
}

function json(method: string, payload: unknown): RequestInit {
  return { method, body: JSON.stringify(payload) };
}

export type ProductInput = {
  name: string;
  category: string;
  cost_price: number;
  selling_price: number;
  quantity_in_stock: number;
  reorder_level: number;
};

export type SaleInput = {
  customer_id: number | null;
  items: Array<{ product_id: number; quantity: number }>;
};

export type PurchaseInput = {
  supplier_id: number;
  product_id: number;
  quantity: number;
  unit_cost: number | null;
};

export type CustomerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type SupplierInput = CustomerInput;

export const api = {
  products: {
    list: (q?: string) =>
      request<Product[]>(`/api/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    lowStock: () => request<Product[]>("/api/products/low-stock"),
    create: (payload: ProductInput) => request<Product>("/api/products", json("POST", payload)),
    update: (id: number, payload: ProductInput) => request<Product>(`/api/products/${id}`, json("PUT", payload)),
    remove: (id: number) => request<void>(`/api/products/${id}`, { method: "DELETE" }),
  },
  customers: {
    list: () => request<Customer[]>("/api/customers"),
    create: (payload: CustomerInput) => request<Customer>("/api/customers", json("POST", payload)),
    update: (id: number, payload: CustomerInput) => request<Customer>(`/api/customers/${id}`, json("PUT", payload)),
    remove: (id: number) => request<void>(`/api/customers/${id}`, { method: "DELETE" }),
    history: (id: number) => request<CustomerHistory>(`/api/customers/${id}/history`),
  },
  suppliers: {
    list: () => request<Supplier[]>("/api/suppliers"),
    create: (payload: SupplierInput) => request<Supplier>("/api/suppliers", json("POST", payload)),
    update: (id: number, payload: SupplierInput) => request<Supplier>(`/api/suppliers/${id}`, json("PUT", payload)),
    remove: (id: number) => request<void>(`/api/suppliers/${id}`, { method: "DELETE" }),
  },
  sales: {
    list: (limit = 10) => request<Sale[]>(`/api/sales?limit=${limit}`),
    create: (payload: SaleInput) => request<Sale>("/api/sales", json("POST", payload)),
  },
  purchases: {
    list: (limit = 15) => request<Purchase[]>(`/api/purchases?limit=${limit}`),
    create: (payload: PurchaseInput) => request<Purchase>("/api/purchases", json("POST", payload)),
  },
  dashboard: {
    summary: () => request<DashboardSummary>("/api/dashboard/summary"),
    monthly: () => request<MonthlyProductSales[]>("/api/dashboard/monthly"),
  },
};
