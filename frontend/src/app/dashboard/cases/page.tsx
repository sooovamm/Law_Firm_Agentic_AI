"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRow } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "@/components/ui/table";
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

  const activeCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);
  const hasFilters = activeCount > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Cases</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Browse and filter all matters{hasFilters ? ` · ${activeCount} filter(s) active` : ""}.
        </p>
      </div>

      <CaseFilterBar filters={filters} onChange={setFilters} lawyers={lawyers} />

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : cases.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={hasFilters ? "No cases match your filters" : "No cases yet"}
            description={
              hasFilters
                ? "Try adjusting or clearing your filters to see more results."
                : "Cases created from intake or manually will show up here."
            }
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Title</TableHeadCell>
                <TableHeadCell>Practice Area</TableHeadCell>
                <TableHeadCell>Client</TableHeadCell>
                <TableHeadCell>Urgency</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {cases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="font-medium text-slate-900 hover:text-brand-600 hover:underline dark:text-slate-100 dark:hover:text-brand-400"
                    >
                      {c.title}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{labelize(c.practice_area)}</TableCell>
                  <TableCell>{c.client?.full_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={urgencyVariant[c.urgency]}>{c.urgency}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[c.status]}>{labelize(c.status)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
