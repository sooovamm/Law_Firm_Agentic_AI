"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { labelize } from "@/components/dashboard/badges";
import { useTheme } from "@/hooks/use-theme";
import type { ChartPoint } from "@/types";

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#94a3b8", "#ef4444", "#8b5cf6"];

export function PracticeAreaChart({ data }: { data: ChartPoint[] }) {
  const { theme } = useTheme();
  const axisColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const rows = data.map((d) => ({ ...d, label: labelize(d.label) }));
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Cases by Practice Area</h2>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No case data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: axisColor }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisColor }} />
              <Tooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.15)" }}
                contentStyle={
                  theme === "dark"
                    ? { backgroundColor: "#1e293b", borderColor: "#334155", color: "#f1f5f9" }
                    : undefined
                }
              />
              <Bar dataKey="value" fill="#1e40af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusChart({ data }: { data: ChartPoint[] }) {
  const { theme } = useTheme();
  const rows = data.map((d) => ({ ...d, label: labelize(d.label) }));
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Cases by Status</h2>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No case data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry: { label?: string; value?: number }) =>
                  `${entry.label} (${entry.value})`
                }
                labelLine={false}
                fontSize={11}
              >
                {rows.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={
                  theme === "dark"
                    ? { backgroundColor: "#1e293b", borderColor: "#334155", color: "#f1f5f9" }
                    : undefined
                }
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
