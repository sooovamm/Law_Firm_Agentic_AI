"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { LawyerStatGrid } from "@/components/lawyers/lawyer-stat-grid";
import { LawyerProfileView } from "@/components/lawyers/lawyer-profile-view";
import { LawyerMatchHistory } from "@/components/lawyers/lawyer-match-history";
import { OverrideMatchDialog } from "@/components/lawyers/override-match-dialog";
import { api, ApiError } from "@/lib/api";
import type { LawyerMatchHistoryItem, LawyerProfileAdmin, User } from "@/types";

export default function LawyerDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const { toast } = useToast();

  const [profile, setProfile] = useState<LawyerProfileAdmin | null>(null);
  const [history, setHistory] = useState<LawyerMatchHistoryItem[]>([]);
  const [lawyers, setLawyers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideTarget, setOverrideTarget] = useState<LawyerMatchHistoryItem | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [p, h, users] = await Promise.all([
        api.getLawyerProfile(userId),
        api.getLawyerMatchHistory(userId),
        api.listUsers(),
      ]);
      setProfile(p);
      setHistory(h);
      setLawyers(users.filter((u) => u.role === "lawyer" && u.id !== userId));
    } catch (err) {
      toast({
        title: "Could not load lawyer",
        description: err instanceof ApiError ? err.detail : "Something went wrong",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function toggleAccepting() {
    if (!profile) return;
    try {
      const updated = await api.setLawyerAcceptingClients(userId, !profile.accepts_new_clients);
      setProfile({ ...profile, accepts_new_clients: updated.accepts_new_clients });
    } catch (err) {
      toast({
        title: "Could not update status",
        description: err instanceof ApiError ? err.detail : "Something went wrong",
        variant: "error",
      });
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading...</div>;
  }

  if (!profile) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Lawyer not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {profile.user.full_name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{profile.user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={profile.accepts_new_clients ? "success" : "default"}>
            {profile.accepts_new_clients ? "Accepting new clients" : "Not accepting new clients"}
          </Badge>
          <Button variant="outline" onClick={toggleAccepting}>
            {profile.accepts_new_clients ? "Disable new clients" : "Enable new clients"}
          </Button>
        </div>
      </div>

      <LawyerStatGrid profile={profile} />
      <LawyerProfileView profile={profile} />
      <LawyerMatchHistory
        history={history}
        actions={(item) =>
          item.case_id != null && !item.was_overridden ? (
            <Button variant="ghost" size="sm" onClick={() => setOverrideTarget(item)}>
              Override
            </Button>
          ) : null
        }
      />

      {overrideTarget && (
        <OverrideMatchDialog
          match={overrideTarget}
          lawyers={lawyers}
          onClose={() => setOverrideTarget(null)}
          onDone={load}
        />
      )}
    </div>
  );
}
