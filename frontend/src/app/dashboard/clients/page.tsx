"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRow } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import type { Client } from "@/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listClients()
      .then((data) => active && setClients(data))
      .catch((err) =>
        active && setError(err instanceof ApiError ? err.detail : "Failed to load clients"),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Clients</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">All clients in your firm.</p>
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
        ) : clients.length === 0 ? (
          <EmptyState icon={Users} title="No clients yet" description="Clients created via intake or added manually will show up here." />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Name</TableHeadCell>
                <TableHeadCell>Email</TableHeadCell>
                <TableHeadCell>Phone</TableHeadCell>
                <TableHeadCell>Company</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">{c.full_name}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>{c.company ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
