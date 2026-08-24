"use client";

import { StatCard, PageHeader } from "@/components/StatCard";
import { CardSkeleton, EmptyState, TableSkeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { naira, nairaCompact, num, toNumber } from "@/lib/format";
import type { DashboardSummary, MonthlyProductSales } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyProductSales[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, m] = await Promise.all([api.dashboard.summary(), api.dashboard.monthly()]);
        if (!cancelled) {
          setSummary(s);
          setMonthly(m);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = {
    labels: (monthly ?? []).map((r) => r.product_name),
    datasets: [
      {
        label: "Revenue",
        data: (monthly ?? []).map((r) => toNumber(r.revenue)),
        backgroundColor: "#6366f1",
        borderRadius: 6,
        maxBarThickness: 42,
      },
    ],
  };

  return (
    <div>
      <PageHeader title="Business Dashboard" subtitle="Today's performance at a glance">
        <Link
          href="/sales"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-md"
        >
          + Record Sale
        </Link>
      </PageHeader>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!summary && !error ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Today's Sales" value={toNumber(summary.todays_sales)} format={(v) => naira(v)} accent="emerald" delay={0} />
          <StatCard label="Products Sold Today" value={summary.products_sold_today} accent="indigo" delay={0.08} />
          <StatCard label="Low Stock" value={summary.low_stock_count} accent="amber" delay={0.16} href="/products/low-stock" pulse />
          <StatCard label="Customers" value={summary.total_customers} accent="violet" delay={0.24} />
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Revenue This Month</h2>
            <Link href="/products" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View products →
            </Link>
          </div>
          {!monthly && !error ? (
            <div className="flex h-72 items-center justify-center">
              <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : monthly && monthly.length > 0 ? (
            <div className="h-72">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 600, easing: "easeOutQuart" },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `Revenue: ${naira(ctx.parsed.y ?? 0)}`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      ticks: { callback: (v) => nairaCompact(Number(v)) },
                      grid: { color: "#f1f5f9" },
                    },
                    x: { grid: { display: false }, ticks: { maxRotation: 40 } },
                  },
                }}
              />
            </div>
          ) : (
            <EmptyState title="No sales this month yet" hint="Record a sale to see the revenue chart grow." />
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Sales This Month</h2>
          </div>
          {!monthly && !error ? (
            <TableSkeleton rows={6} cols={3} />
          ) : monthly && monthly.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-slate-400 uppercase">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 text-right font-semibold">Qty</th>
                  <th className="px-5 py-3 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {monthly.slice(0, 10).map((r, i) => (
                  <tr key={r.product_id} className={i % 2 === 0 ? "" : "bg-slate-50/60"}>
                    <td className="max-w-40 truncate px-5 py-2.5 font-medium text-slate-700">{r.product_name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(r.quantity_sold)}</td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{naira(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Nothing sold yet this month" />
          )}
        </section>
      </div>
    </div>
  );
}
