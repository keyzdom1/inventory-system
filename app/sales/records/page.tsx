"use client";

import { PageHeader } from "@/components/StatCard";
import { EmptyState, TableSkeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { dateTime, naira } from "@/lib/format";
import type { Sale } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SalesRecordsPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await api.sales.list(page, limit);
        if (!cancelled) {
          setSales(res.items);
          setTotalPages(res.pages);
          setTotal(res.total);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load sales");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page]);

  const showingFrom = total === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, total);

  return (
    <div>
      <PageHeader title="Sales Records" subtitle={`${total} sale${total !== 1 ? "s" : ""} total`}>
        <Link
          href="/sales"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-md"
        >
          + Record Sale
        </Link>
      </PageHeader>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : sales && sales.length === 0 ? (
        <EmptyState title="No sales recorded" hint="Your first sale will appear here." />
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs tracking-wide text-slate-400 uppercase dark:border-slate-700">
                    <th className="px-5 py-3 font-semibold">Sale #</th>
                    <th className="px-5 py-3 font-semibold">Date & Time</th>
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
                        {s.items[0]?.product_name ?? ""}
                        {s.items.length > 1 && ` +${s.items.length - 1} more`}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200">{naira(s.total_amount)}</td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-emerald-600">{naira(s.total_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {showingFrom}–{showingTo} of {total} sales
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        page === pageNum
                          ? "bg-indigo-600 text-white"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
