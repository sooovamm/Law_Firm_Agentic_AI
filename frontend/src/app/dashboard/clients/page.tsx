"use client";

import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Clients</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">All clients in your firm.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">No clients yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-left text-xs uppercase text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-950">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{c.full_name}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{c.email ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{c.phone ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{c.company ?? "—"}</td>
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
