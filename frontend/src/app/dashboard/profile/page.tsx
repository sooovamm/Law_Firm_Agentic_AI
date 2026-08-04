"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LawyerStatGrid } from "@/components/lawyers/lawyer-stat-grid";
import { LawyerProfileView } from "@/components/lawyers/lawyer-profile-view";
import { LawyerMatchHistory } from "@/components/lawyers/lawyer-match-history";
import { StepBasicInfo } from "@/components/onboarding/step-basic-info";
import { StepProfessionalInfo } from "@/components/onboarding/step-professional-info";
import { StepExperience } from "@/components/onboarding/step-experience";
import { StepPreferences } from "@/components/onboarding/step-preferences";
import { labelize, statusVariant, urgencyVariant } from "@/components/dashboard/badges";
import { api, ApiError } from "@/lib/api";
import { toLawyerProfileInput } from "@/lib/lawyer-profile";
import type { CaseListItem, LawyerMatchHistoryItem, LawyerProfile, LawyerProfileInput } from "@/types";

export default function LawyerProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [history, setHistory] = useState<LawyerMatchHistoryItem[]>([]);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LawyerProfileInput>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const [p, h, c] = await Promise.all([
        api.getMyLawyerProfile(),
        api.getLawyerMatchHistory(user.id),
        api.listCasesFiltered({ assigned_lawyer_id: user.id }),
      ]);
      setProfile(p);
      setHistory(h);
      setCases(c);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function startEditing() {
    if (!profile) return;
    setDraft(toLawyerProfileInput(profile));
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.saveLawyerDraft(draft);
      toast({ title: "Profile updated", variant: "success" });
      setEditing(false);
      await load();
    } catch (err) {
      toast({
        title: "Could not save changes",
        description: err instanceof ApiError ? err.detail : "Something went wrong",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No profile yet"
        description="Complete your onboarding to build your lawyer profile."
        primaryAction={
          <Button asChild>
            <Link href="/onboarding">Start onboarding</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            My Profile
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {user?.full_name} · {labelize(profile.primary_practice_area ?? "")}
          </p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save changes
            </Button>
          </div>
        ) : (
          <Button onClick={startEditing}>Edit profile</Button>
        )}
      </div>

      <LawyerStatGrid profile={profile} />

      {editing ? (
        <div className="space-y-4">
          <StepBasicInfo data={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} errors={{}} />
          <StepProfessionalInfo
            data={draft}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            errors={{}}
          />
          <StepExperience data={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} errors={{}} />
          <StepPreferences data={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} errors={{}} />
        </div>
      ) : (
        <LawyerProfileView profile={profile} />
      )}

      <LawyerMatchHistory history={history} />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800/80">
          <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Assigned Cases
          </h3>
        </div>
        {cases.length === 0 ? (
          <EmptyState icon={Briefcase} title="No cases assigned yet" />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Title</TableHeadCell>
                <TableHeadCell>Practice Area</TableHeadCell>
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
