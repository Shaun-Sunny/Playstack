"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { apiJson, type DashboardStats } from "@/lib/ems";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const response = await apiJson<DashboardStats>("/api/dashboard/stats");
        if (mounted) {
          setStats(response);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      mounted = false;
    };
  }, []);

  const chartData = stats?.departments ?? [];
  const cards = [
    { label: "Total", value: stats?.totalEmployees ?? 0 },
    { label: "Active", value: stats?.activeEmployees ?? 0 },
    { label: "Inactive", value: stats?.inactiveEmployees ?? 0 },
    { label: "Department Count", value: stats?.departmentCount ?? 0 },
  ];

  return (
    <ProtectedRoute>
      <AppShell title="Dashboard" subtitle="Overview of employee health and department distribution.">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.label}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 backdrop-blur"
            >
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {loading ? "--" : card.value}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Employees per department</h2>
              <p className="text-sm text-slate-400">Fetched from /api/dashboard/stats.</p>
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="department" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: 16,
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="count" fill="#22d3ee" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}