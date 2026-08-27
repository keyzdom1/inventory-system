"use client";

import { useTheme } from "@/components/ThemeProvider";
import { nairaCompact } from "@/lib/format";
import { Chart as ChartJS } from "chart.js/auto";
import { Bar } from "react-chartjs-2";

ChartJS.register();

export default function RevenueChart({ chartData }: { chartData: ReturnType<typeof Object> & { labels: string[]; datasets: { label: string; data: number[]; backgroundColor: string; borderRadius: number; maxBarThickness: number }[] } }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Bar
      data={{
        ...chartData,
        datasets: chartData.datasets.map((ds: { label: string; data: number[]; backgroundColor: string; borderRadius: number; maxBarThickness: number }) => ({
          ...ds,
          backgroundColor: isDark ? "#818cf8" : "#6366f1",
        })),
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Revenue: ₦${Number(ctx.parsed.y ?? 0).toLocaleString()}`,
            },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => nairaCompact(Number(v)),
              color: isDark ? "#94a3b8" : "#64748b",
            },
            grid: { color: isDark ? "#1e293b" : "#f1f5f9" },
          },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 40, color: isDark ? "#94a3b8" : "#64748b" },
          },
        },
      }}
    />
  );
}
