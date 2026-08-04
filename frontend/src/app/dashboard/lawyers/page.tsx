"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Gavel } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRow } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "@/components/ui/table";
import { labelize } from "@/lib/labelize";
import { api, ApiError } from "@/lib/api";
import { LAWYER_PRACTICE_AREAS, type LawyerPracticeArea, type LawyerProfileAdmin } from "@/types";

const ALL = "__all__";

export default function LawyersPage() {
  const [lawyers, setLawyers] = useState<LawyerProfileAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [practiceArea, setPracticeArea] = useState<LawyerPracticeArea | "">("");
  const [minExperience, setMinExperience] = useState("");
  const [maxWorkload, setMaxWorkload] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listLawyers({
        q: q || undefined,
        practice_area: practiceArea || undefined,
        min_experience: minExperience ? Number(minExperience) : undefined,
        max_workload: maxWorkload ? Number(maxWorkload) : undefined,
      });
      setLawyers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load lawyers");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, practiceArea, minExperience, maxWorkload]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleAccepting(userId: number, next: boolean) {
    setLawyers((prev) =>
      prev.map((l) => (l.user_id === userId ? { ...l, accepts_new_clients: next } : l)),
    );
    try {
      await api.setLawyerAcceptingClients(userId, next);
    } catch {
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Lawyers</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Browse the firm&apos;s lawyers, filter by specialization, and manage assignments.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or firm..." />
        <Select
          value={practiceArea || ALL}
          onValueChange={(v) => setPracticeArea(v === ALL ? "" : (v as LawyerPracticeArea))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Practice Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Areas</SelectItem>
            {LAWYER_PRACTICE_AREAS.map((a) => (
              <SelectItem key={a} value={a} className="capitalize">
                {labelize(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={0}
          placeholder="Min. experience (years)"
          value={minExperience}
          onChange={(e) => setMinExperience(e.target.value)}
        />
        <Input
          type="number"
          min={0}
          placeholder="Max. workload"
          value={maxWorkload}
          onChange={(e) => setMaxWorkload(e.target.value)}
        />
      </div>

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
        ) : lawyers.length === 0 ? (
          <EmptyState icon={Gavel} title="No lawyers match your filters" />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Name</TableHeadCell>
                <TableHeadCell>Primary Area</TableHeadCell>
                <TableHeadCell>Experience</TableHeadCell>
                <TableHeadCell>Workload</TableHeadCell>
                <TableHeadCell>Accepting Clients</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {lawyers.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/lawyers/${l.user_id}`}
                      className="font-medium text-slate-900 hover:text-brand-600 hover:underline dark:text-slate-100 dark:hover:text-brand-400"
                    >
                      {l.user.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">
                    {l.primary_practice_area ? labelize(l.primary_practice_area) : "—"}
                  </TableCell>
                  <TableCell>{l.years_of_experience ?? "—"} yrs</TableCell>
                  <TableCell>
                    {l.current_workload} / {l.weekly_capacity}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleAccepting(l.user_id, !l.accepts_new_clients)}
                      className="cursor-pointer"
                    >
                      <Badge variant={l.accepts_new_clients ? "success" : "default"}>
                        {l.accepts_new_clients ? "Accepting" : "Not accepting"}
                      </Badge>
                    </button>
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
