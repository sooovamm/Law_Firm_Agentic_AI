"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CaseFilterBar, type CaseFilters } from "@/components/dashboard/case-filter-bar";
import { labelize, statusVariant, urgencyVariant } from "@/components/dashboard/badges";
import { api, ApiError } from "@/lib/api";
import type { CaseListItem, User } from "@/types";

const EMPTY: CaseFilters = {
  q: "",
  practice_area: "",
  status: "",
  urgency: "",
  assigned_lawyer_id: "",
  created_from: "",
};

export default function CasesPage() {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [lawyers, setLawyers] = useState<User[]>([]);
  const [filters, setFilters] = useState<CaseFilters>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load lawyers for the filter (best-effort; requires admin).
  useEffect(() => {
    api
      .listUsers()
      .then((users) => setLawyers(users.filter((u) => u.role === "lawyer" || u.role === "admin")))
      .catch(() => setLawyers([]));
  }, []);

  const load = useCallback(async (f: CaseFilters) => {
    setLoading(true);
    try {
      const data = await api.listCasesFiltered({
        q: f.q || undefined,
        practice_area: f.practice_area || undefined,
        status: f.status || undefined,
        urgency: f.urgency || undefined,
        assigned_lawyer_id: f.assigned_lawyer_id ? Number(f.assigned_lawyer_id) : undefined,
        created_from: f.created_from ? new Date(f.created_from).toISOString() : undefined,
      });
      setCases(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced reload on filter change.
  useEffect(() => {
    const t = setTimeout(() => load(filters), 300);
    return () => clearTimeout(t);
  }, [filters, load]);

  const activeCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cases</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Browse and filter all matters{activeCount > 0 ? ` · ${activeCount} filter(s) active` : ""}.
        </p>
      </div>

      <CaseFilterBar filters={filters} onChange={setFilters} lawyers={lawyers} />

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading cases...</div>
          ) : cases.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No cases match your filters.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-left text-xs uppercase text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Practice Area</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Urgency</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-950">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/cases/${c.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:text-brand hover:underline"
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 capitalize text-slate-600 dark:text-slate-400">
                      {labelize(c.practice_area)}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{c.client?.full_name ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge variant={urgencyVariant[c.urgency]}>{c.urgency}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant[c.status]}>{labelize(c.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
