"use client";

import { PageHeader } from "@/components/StatCard";
import { EmptyState, TableSkeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { dateTime, naira } from "@/lib/format";
import type { PaginatedResponse, Sale } from "@/lib/types";
import { useEffect, useState } from "react";

function toDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function extractSales(data: PaginatedResponse<Sale> | Sale[]): Sale[] {
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export default function TodaySalesPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const todayStr = toDateString(today);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.sales.listByDay(todayStr);
        if (!cancelled) setSales(extractSales(res));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load sales");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [todayStr]);

  return (
    <div>
      <PageHeader title="Today's Sales" subtitle={formatDisplayDate(today)} />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!sales && !error ? (
        <TableSkeleton rows={6} cols={5} />
      ) : sales && sales.length === 0 ? (
        <EmptyState title="No sales today" hint="Sales made today will appear here." />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs tracking-wide text-slate-400 uppercase dark:border-slate-700">
                  <th className="px-5 py-3 font-semibold">Sale #</th>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 text-right font-semibold">Profit</th>
                </tr>
              </thead>
              <tbody>
                {sales!.map((s, i) => (
                  <tr key={s.id} className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/60 dark:bg-slate-700/30"} dark:border-slate-700`}>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">#{s.id}</td>
                    <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-400">{dateTime(s.sale_date)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{s.customer_name ?? "Walk-in customer"}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {s.items.map((it) => it.product_name).join(", ")}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200">{naira(s.total_amount)}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-emerald-600">{naira(s.total_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
