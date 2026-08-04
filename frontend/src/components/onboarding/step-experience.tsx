"use client";

import type { ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LawyerProfileInput } from "@/types";

interface StepProps {
  data: LawyerProfileInput;
  onChange: (patch: Partial<LawyerProfileInput>) => void;
  errors: Record<string, string>;
}

function numberField(value: number | undefined) {
  return value ?? "";
}

export function StepExperience({ data, onChange, errors }: StepProps) {
  function num(field: keyof LawyerProfileInput) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      onChange({
        [field]: e.target.value === "" ? undefined : Number(e.target.value),
      } as Partial<LawyerProfileInput>);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experience</CardTitle>
        <CardDescription>Your track record helps us match the right clients to you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="total">Total cases</Label>
            <Input
              id="total"
              type="number"
              min={0}
              value={numberField(data.total_cases_handled)}
              onChange={num("total_cases_handled")}
            />
          </div>
          <div>
            <Label htmlFor="won">Cases won</Label>
            <Input
              id="won"
              type="number"
              min={0}
              value={numberField(data.total_cases_won)}
              onChange={num("total_cases_won")}
              error={!!errors.total_cases_won}
            />
          </div>
          <div>
            <Label htmlFor="lost">Cases lost</Label>
            <Input
              id="lost"
              type="number"
              min={0}
              value={numberField(data.total_cases_lost)}
              onChange={num("total_cases_lost")}
              error={!!errors.total_cases_lost}
            />
          </div>
          <div>
            <Label htmlFor="settlement">Settlement cases</Label>
            <Input
              id="settlement"
              type="number"
              min={0}
              value={numberField(data.settlement_cases)}
              onChange={num("settlement_cases")}
            />
          </div>
          <div>
            <Label htmlFor="appeal">Appeal cases</Label>
            <Input
              id="appeal"
              type="number"
              min={0}
              value={numberField(data.appeal_cases)}
              onChange={num("appeal_cases")}
            />
          </div>
          <div>
            <Label htmlFor="active">Active cases</Label>
            <Input
              id="active"
              type="number"
              min={0}
              value={numberField(data.active_cases)}
              onChange={num("active_cases")}
            />
          </div>
        </div>
        {(errors.total_cases_won || errors.total_cases_lost) && (
          <p className="text-xs text-rose-600 dark:text-rose-400">
            {errors.total_cases_won || errors.total_cases_lost}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="duration">Average case duration (days)</Label>
            <Input
              id="duration"
              type="number"
              min={0}
              value={numberField(data.average_case_duration_days)}
              onChange={num("average_case_duration_days")}
            />
          </div>
          <div>
            <Label htmlFor="largest">Largest case value ($)</Label>
            <Input
              id="largest"
              type="number"
              min={0}
              value={numberField(data.largest_case_value)}
              onChange={num("largest_case_value")}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="achievements">Notable achievements</Label>
          <Textarea
            id="achievements"
            rows={4}
            value={data.notable_achievements ?? ""}
            onChange={(e) => onChange({ notable_achievements: e.target.value })}
            placeholder="Awards, landmark cases, published work..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
