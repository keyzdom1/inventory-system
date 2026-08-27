import type {
  Customer,
  CustomerHistory,
  DashboardSummary,
  MonthlyProductSales,
  PaginatedResponse,
  Product,
  Purchase,
  Sale,
  Supplier,
  Token,
  User,
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

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  } else {
    localStorage.removeItem("user");
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  try {
    res = await fetch(path, {
      cache: "no-store",
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(0, null, "Cannot reach the server. Is the backend running?");
  }
  if (res.status === 401) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const message = extractMessage("Invalid username or password", body);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      setToken(null);
      setStoredUser(null);
      window.location.href = "/login";
      throw new ApiError(401, null, "Session expired. Please log in again.");
    }
    throw new ApiError(401, body, message);
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
  auth: {
    login: (username: string, password: string) =>
      request<Token>("/api/auth/login", json("POST", { username, password })),
    register: (username: string, email: string, password: string) =>
      request<Token>("/api/auth/register", json("POST", { username, email, password })),
    me: () => request<User>("/api/auth/me"),
  },
  products: {
    list: (q?: string, page = 1, limit = 20) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("limit", String(limit));
      return request<PaginatedResponse<Product>>(`/api/products?${params}`);
    },
    lowStock: () => request<Product[]>("/api/products/low-stock"),
    create: (payload: ProductInput) => request<Product>("/api/products", json("POST", payload)),
    update: (id: number, payload: Partial<ProductInput>) => request<Product>(`/api/products/${id}`, json("PUT", payload)),
    remove: (id: number) => request<void>(`/api/products/${id}`, { method: "DELETE" }),
  },
  customers: {
    list: (page = 1, limit = 20) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      return request<PaginatedResponse<Customer>>(`/api/customers?${params}`);
    },
    create: (payload: CustomerInput) => request<Customer>("/api/customers", json("POST", payload)),
    update: (id: number, payload: CustomerInput) => request<Customer>(`/api/customers/${id}`, json("PUT", payload)),
    remove: (id: number) => request<void>(`/api/customers/${id}`, { method: "DELETE" }),
    history: (id: number) => request<CustomerHistory>(`/api/customers/${id}/history`),
  },
  suppliers: {
    list: (page = 1, limit = 20) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      return request<PaginatedResponse<Supplier>>(`/api/suppliers?${params}`);
    },
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
