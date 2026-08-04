import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { labelize } from "@/lib/labelize";
import type { LawyerProfile } from "@/types";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900 dark:text-slate-100">{value || "—"}</p>
    </div>
  );
}

export function LawyerProfileView({ profile }: { profile: LawyerProfile }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Years of experience" value={String(profile.years_of_experience ?? "—")} />
            <Field label="Law firm" value={profile.law_firm_name ?? ""} />
            <Field label="Current position" value={profile.current_position ?? ""} />
            <Field label="Highest qualification" value={profile.highest_qualification ?? ""} />
            <Field label="Bar registration number" value={profile.bar_registration_number ?? ""} />
          </div>
          {profile.biography && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Biography
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{profile.biography}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Practice Areas &amp; Languages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Practice areas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.primary_practice_area && (
                <Badge variant="brand">{labelize(profile.primary_practice_area)} (primary)</Badge>
              )}
              {profile.secondary_practice_areas.map((a) => (
                <Badge key={a}>{labelize(a)}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Languages
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.languages_spoken.map((l) => (
                <Badge key={l} variant="info">
                  {l}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Jurisdictions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.jurisdictions.length === 0 ? (
                <span className="text-sm text-slate-400">—</span>
              ) : (
                profile.jurisdictions.map((j) => <Badge key={j}>{j}</Badge>)
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Accepting new clients"
            value={profile.accepts_new_clients ? "Yes" : "No"}
          />
          <Field label="Weekly capacity" value={String(profile.weekly_capacity)} />
          <Field
            label="Consultation days"
            value={profile.preferred_consultation_days.map(labelize).join(", ")}
          />
          <Field
            label="Consultation hours"
            value={
              profile.preferred_consultation_hours_start && profile.preferred_consultation_hours_end
                ? `${profile.preferred_consultation_hours_start} – ${profile.preferred_consultation_hours_end}`
                : ""
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case Statistics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Total cases" value={String(profile.total_cases_handled)} />
          <Field label="Won" value={String(profile.total_cases_won)} />
          <Field label="Lost" value={String(profile.total_cases_lost)} />
          <Field label="Settlements" value={String(profile.settlement_cases)} />
          <Field label="Appeals" value={String(profile.appeal_cases)} />
          <Field label="Active" value={String(profile.active_cases)} />
        </CardContent>
      </Card>
    </div>
  );
}
