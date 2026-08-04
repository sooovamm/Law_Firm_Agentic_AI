"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { labelize } from "@/lib/labelize";
import type { LawyerProfileInput } from "@/types";

interface StepReviewProps {
  data: LawyerProfileInput;
  onEdit: (step: number) => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-medium text-slate-900 dark:text-slate-100">
        {value || "—"}
      </span>
    </div>
  );
}

export function StepReview({ data, onEdit }: StepReviewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Experience, languages, biography.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(0)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-slate-50 dark:divide-slate-800/60">
          <Row label="Years of experience" value={String(data.years_of_experience ?? "")} />
          <Row label="Languages" value={(data.languages_spoken ?? []).join(", ")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>Practice areas, bar registration, firm.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <Row
            label="Primary practice area"
            value={data.primary_practice_area ? labelize(data.primary_practice_area) : ""}
          />
          <div className="flex items-start justify-between gap-4 py-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Secondary areas</span>
            <div className="flex max-w-[65%] flex-wrap justify-end gap-1">
              {(data.secondary_practice_areas ?? []).map((a) => (
                <Badge key={a} variant="brand">
                  {labelize(a)}
                </Badge>
              ))}
              {(data.secondary_practice_areas ?? []).length === 0 && (
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">—</span>
              )}
            </div>
          </div>
          <Row label="Bar registration number" value={data.bar_registration_number ?? ""} />
          <Row label="Jurisdictions" value={(data.jurisdictions ?? []).join(", ")} />
          <Row label="Law firm" value={data.law_firm_name ?? ""} />
          <Row label="Current position" value={data.current_position ?? ""} />
          <Row label="Highest qualification" value={data.highest_qualification ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Experience</CardTitle>
            <CardDescription>Case statistics and track record.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(2)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-slate-50 dark:divide-slate-800/60">
          <Row label="Total cases" value={String(data.total_cases_handled ?? 0)} />
          <Row label="Cases won" value={String(data.total_cases_won ?? 0)} />
          <Row label="Cases lost" value={String(data.total_cases_lost ?? 0)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Work Preferences</CardTitle>
            <CardDescription>Availability and case preferences.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(3)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-slate-50 dark:divide-slate-800/60">
          <Row label="Maximum active cases" value={String(data.weekly_capacity ?? "")} />
          <Row label="Accepting new clients" value={data.accepts_new_clients === false ? "No" : "Yes"} />
          <Row
            label="Consultation days"
            value={(data.preferred_consultation_days ?? []).map(labelize).join(", ")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
