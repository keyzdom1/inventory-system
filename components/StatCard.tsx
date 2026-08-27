"use client";

import { animate, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.7,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(format ? format(v) : Math.round(v).toLocaleString("en-NG")),
    });
    return () => controls.stop();
  }, [value, format]);

  return <span>{display}</span>;
}

export function StatCard({
  label,
  value,
  format,
  accent = "indigo",
  delay = 0,
  href,
  pulse = false,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  accent?: "indigo" | "emerald" | "amber" | "violet";
  delay?: number;
  href?: string;
  pulse?: boolean;
}) {
  const accents: Record<string, string> = {
    indigo: "from-indigo-500 to-indigo-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-orange-500",
    violet: "from-violet-500 to-purple-600",
  };

  const pulseOn = pulse && value > 0;

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0, scale: pulseOn ? [1, 1.04, 1] : 1 }}
      transition={{
        duration: 0.35,
        delay,
        ease: "easeOut",
        scale: pulseOn ? { repeat: Infinity, duration: 2, ease: "easeInOut", delay: delay + 0.5 } : undefined,
      }}
      whileHover={{ scale: 1.02 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{label}</p>
      <p
        className={`mt-2 bg-gradient-to-r bg-clip-text text-2xl font-black text-transparent sm:text-3xl ${accents[accent]}`}
      >
        <CountUp value={value} format={format} />
      </p>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
