"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { MultiSelectChips } from "@/components/ui/multi-select-chips";
import { TagInput } from "@/components/ui/tag-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { labelize } from "@/lib/labelize";
import { LAWYER_PRACTICE_AREAS, type LawyerProfileInput } from "@/types";

interface StepProps {
  data: LawyerProfileInput;
  onChange: (patch: Partial<LawyerProfileInput>) => void;
  errors: Record<string, string>;
}

export function StepProfessionalInfo({ data, onChange, errors }: StepProps) {
  const secondary = data.secondary_practice_areas ?? [];
  const primary = data.primary_practice_area;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional Information</CardTitle>
        <CardDescription>Your specializations and credentials.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Primary practice area</Label>
          <Select
            value={primary ?? ""}
            onValueChange={(v) => onChange({ primary_practice_area: v as LawyerProfileInput["primary_practice_area"] })}
          >
            <SelectTrigger className={errors.primary_practice_area ? "border-rose-400" : undefined}>
              <SelectValue placeholder="Select a practice area" />
            </SelectTrigger>
            <SelectContent>
              {LAWYER_PRACTICE_AREAS.map((area) => (
                <SelectItem key={area} value={area} className="capitalize">
                  {labelize(area)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.primary_practice_area && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.primary_practice_area}</p>
          )}
        </div>

        <div>
          <Label>Secondary practice areas</Label>
          <MultiSelectChips
            options={LAWYER_PRACTICE_AREAS.filter((a) => a !== primary).map((a) => ({
              value: a,
              label: labelize(a),
            }))}
            value={secondary}
            onChange={(v) => onChange({ secondary_practice_areas: v as LawyerProfileInput["secondary_practice_areas"] })}
          />
        </div>

        <div>
          <Label htmlFor="bar">Bar registration number</Label>
          <Input
            id="bar"
            value={data.bar_registration_number ?? ""}
            onChange={(e) => onChange({ bar_registration_number: e.target.value })}
            error={!!errors.bar_registration_number}
          />
          {errors.bar_registration_number && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.bar_registration_number}</p>
          )}
        </div>

        <div>
          <Label>Jurisdictions</Label>
          <TagInput
            value={data.jurisdictions ?? []}
            onChange={(jurisdictions) => onChange({ jurisdictions })}
            placeholder="Add a jurisdiction and press Enter"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firm">Law firm name</Label>
            <Input
              id="firm"
              value={data.law_firm_name ?? ""}
              onChange={(e) => onChange({ law_firm_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="position">Current position</Label>
            <Input
              id="position"
              value={data.current_position ?? ""}
              onChange={(e) => onChange({ current_position: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="qualification">Highest qualification</Label>
          <Input
            id="qualification"
            value={data.highest_qualification ?? ""}
            onChange={(e) => onChange({ highest_qualification: e.target.value })}
            placeholder="e.g. J.D., LL.M."
          />
        </div>
      </CardContent>
    </Card>
  );
}
