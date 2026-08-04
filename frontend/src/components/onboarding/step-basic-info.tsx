"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import type { LawyerProfileInput } from "@/types";

interface StepProps {
  data: LawyerProfileInput;
  onChange: (patch: Partial<LawyerProfileInput>) => void;
  errors: Record<string, string>;
}

export function StepBasicInfo({ data, onChange, errors }: StepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Tell us a bit about your background.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="years">Years of experience</Label>
          <Input
            id="years"
            type="number"
            min={0}
            max={70}
            value={data.years_of_experience ?? ""}
            onChange={(e) =>
              onChange({ years_of_experience: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            error={!!errors.years_of_experience}
          />
          {errors.years_of_experience && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.years_of_experience}</p>
          )}
        </div>

        <div>
          <Label>Languages spoken</Label>
          <TagInput
            value={data.languages_spoken ?? []}
            onChange={(languages_spoken) => onChange({ languages_spoken })}
            placeholder="Add a language and press Enter"
          />
          {errors.languages_spoken && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.languages_spoken}</p>
          )}
        </div>

        <div>
          <Label htmlFor="bio">Biography</Label>
          <Textarea
            id="bio"
            rows={5}
            value={data.biography ?? ""}
            onChange={(e) => onChange({ biography: e.target.value })}
            placeholder="A short professional biography clients will see on your profile..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
