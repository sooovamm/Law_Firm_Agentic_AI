"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { MultiSelectChips } from "@/components/ui/multi-select-chips";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LawyerProfileInput } from "@/types";

interface StepProps {
  data: LawyerProfileInput;
  onChange: (patch: Partial<LawyerProfileInput>) => void;
  errors: Record<string, string>;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const COMPLEXITY_OPTIONS = ["simple", "moderate", "complex", "highly_complex"] as const;
const CLIENT_TYPE_OPTIONS = ["individual", "business", "both"] as const;

export function StepPreferences({ data, onChange, errors }: StepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Preferences</CardTitle>
        <CardDescription>How much work you can take on, and what kind.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="capacity">Maximum active cases</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              value={data.weekly_capacity ?? ""}
              onChange={(e) =>
                onChange({ weekly_capacity: e.target.value === "" ? undefined : Number(e.target.value) })
              }
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
                checked={data.accepts_new_clients ?? true}
                onChange={(e) => onChange({ accepts_new_clients: e.target.checked })}
              />
              Currently accepting new clients
            </label>
          </div>
        </div>

        <div>
          <Label>Preferred consultation days</Label>
          <MultiSelectChips
            options={DAYS.map((d) => ({ value: d, label: d }))}
            value={data.preferred_consultation_days ?? []}
            onChange={(v) => onChange({ preferred_consultation_days: v })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="hours-start">Consultation hours start</Label>
            <Input
              id="hours-start"
              type="time"
              value={data.preferred_consultation_hours_start ?? ""}
              onChange={(e) => onChange({ preferred_consultation_hours_start: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hours-end">Consultation hours end</Label>
            <Input
              id="hours-end"
              type="time"
              value={data.preferred_consultation_hours_end ?? ""}
              onChange={(e) => onChange({ preferred_consultation_hours_end: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="min-value">Minimum case value ($)</Label>
            <Input
              id="min-value"
              type="number"
              min={0}
              value={data.minimum_case_value ?? ""}
              onChange={(e) =>
                onChange({ minimum_case_value: e.target.value === "" ? undefined : Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="max-value">Maximum case value ($)</Label>
            <Input
              id="max-value"
              type="number"
              min={0}
              value={data.maximum_case_value ?? ""}
              onChange={(e) =>
                onChange({ maximum_case_value: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              error={!!errors.maximum_case_value}
            />
          </div>
        </div>
        {errors.maximum_case_value && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{errors.maximum_case_value}</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Case complexity preference</Label>
            <Select
              value={data.preferred_case_complexity ?? ""}
              onValueChange={(v) =>
                onChange({ preferred_case_complexity: v as LawyerProfileInput["preferred_case_complexity"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No preference" />
              </SelectTrigger>
              <SelectContent>
                {COMPLEXITY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Preferred client type</Label>
            <Select
              value={data.preferred_client_type ?? ""}
              onValueChange={(v) => onChange({ preferred_client_type: v as LawyerProfileInput["preferred_client_type"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No preference" />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_TYPE_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
