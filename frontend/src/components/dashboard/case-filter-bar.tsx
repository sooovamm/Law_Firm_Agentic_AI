"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import type { User } from "@/types";

export interface CaseFilters {
  q: string;
  practice_area: string;
  status: string;
  urgency: string;
  assigned_lawyer_id: string;
  created_from: string;
}

const PRACTICE_AREAS = [
  "corporate",
  "criminal",
  "family",
  "immigration",
  "intellectual_property",
  "labor",
  "real_estate",
  "tax",
  "litigation",
  "other",
];
const STATUSES = ["open", "in_progress", "on_hold", "closed"];
const URGENCIES = ["low", "medium", "high", "critical"];

const ALL = "__all__";

export function CaseFilterBar({
  filters,
  onChange,
  lawyers,
}: {
  filters: CaseFilters;
  onChange: (next: CaseFilters) => void;
  lawyers: User[];
}) {
  const set = (patch: Partial<CaseFilters>) => onChange({ ...filters, ...patch });
  const norm = (v: string) => (v === ALL ? "" : v);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div className="lg:col-span-2">
        <SearchInput
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search cases..."
        />
      </div>

      <Select value={filters.practice_area || ALL} onValueChange={(v) => set({ practice_area: norm(v) })}>
        <SelectTrigger>
          <SelectValue placeholder="Practice Area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All Areas</SelectItem>
          {PRACTICE_AREAS.map((a) => (
            <SelectItem key={a} value={a} className="capitalize">
              {a.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status || ALL} onValueChange={(v) => set({ status: norm(v) })}>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All Statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.urgency || ALL} onValueChange={(v) => set({ urgency: norm(v) })}>
        <SelectTrigger>
          <SelectValue placeholder="Urgency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All Urgencies</SelectItem>
          {URGENCIES.map((u) => (
            <SelectItem key={u} value={u} className="capitalize">
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assigned_lawyer_id || ALL}
        onValueChange={(v) => set({ assigned_lawyer_id: norm(v) })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Lawyer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All Lawyers</SelectItem>
          {lawyers.map((l) => (
            <SelectItem key={l.id} value={String(l.id)}>
              {l.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={filters.created_from}
        onChange={(e) => set({ created_from: e.target.value })}
        className="text-slate-600 dark:text-slate-400 lg:col-span-1"
      />
    </div>
  );
}
