"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import type { CaseListItem } from "@/types";

const TYPES = ["hearing", "filing", "appeal", "evidence", "other"];
const PRIORITIES = ["low", "medium", "high", "critical"];

export function AddDeadlineDialog({
  onClose,
  onCreated,
  cases,
}: {
  onClose: () => void;
  onCreated: () => void;
  cases: CaseListItem[];
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [type, setType] = useState("filing");
  const [priority, setPriority] = useState("medium");
  const [caseId, setCaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim() || !date) {
      setError("Title and date are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const dueIso = new Date(`${date}T${time}:00`).toISOString();
      await api.createDeadline({
        title: title.trim(),
        due_date: dueIso,
        deadline_type: type,
        priority,
        case_id: caseId ? Number(caseId) : undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create deadline");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Add Deadline</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="deadline-title">Title</Label>
            <Input
              id="deadline-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. File response to motion"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="deadline-date">Date</Label>
              <Input id="deadline-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="deadline-time">Time</Label>
              <Input id="deadline-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Case (optional)</Label>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Link to a case" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Add Deadline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
