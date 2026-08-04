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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { labelize } from "@/lib/labelize";
import { useTheme } from "@/hooks/use-theme";
import type { ChartPoint } from "@/types";

const PIE_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#3b82f6", "#f43f5e", "#94a3b8"];

function tooltipStyle(dark: boolean) {
  return {
    borderRadius: 12,
    border: "none",
    boxShadow: "0 12px 32px -8px rgb(15 23 42 / 0.16)",
    fontSize: 13,
    ...(dark ? { backgroundColor: "#0f172a", color: "#f1f5f9" } : { backgroundColor: "#ffffff", color: "#0f172a" }),
  };
}

export function PracticeAreaChart({ data }: { data: ChartPoint[] }) {
  const { theme } = useTheme();
  const axisColor = theme === "dark" ? "#64748b" : "#94a3b8";
  const rows = data.map((d) => ({ ...d, label: labelize(d.label) }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cases by Practice Area</CardTitle>
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
                axisLine={{ stroke: theme === "dark" ? "#1e293b" : "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: "rgba(99, 102, 241, 0.08)" }} contentStyle={tooltipStyle(theme === "dark")} />
              <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={48} />
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
        <CardTitle>Cases by Status</CardTitle>
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
                innerRadius={50}
                outerRadius={90}
                paddingAngle={rows.length > 1 ? 2 : 0}
                cornerRadius={rows.length > 1 ? 6 : 0}
                label={(entry: { label?: string; value?: number }) => `${entry.label} (${entry.value})`}
                labelLine={false}
                fontSize={11}
              >
                {rows.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle(theme === "dark")} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
