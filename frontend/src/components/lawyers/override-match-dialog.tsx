"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import type { LawyerMatchHistoryItem, User } from "@/types";

export function OverrideMatchDialog({
  match,
  lawyers,
  onClose,
  onDone,
}: {
  match: LawyerMatchHistoryItem;
  lawyers: User[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [lawyerId, setLawyerId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!lawyerId) return;
    setSaving(true);
    setError(null);
    try {
      await api.overrideLawyerMatch(match.id, Number(lawyerId));
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to override assignment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Override lawyer assignment</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The AI recommended this lawyer with a match score of {match.match_score}. You can
            reassign the case to a different lawyer; this is always your call to make.
          </p>
          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
              {error}
            </div>
          )}
          <Select value={lawyerId} onValueChange={setLawyerId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a lawyer" />
            </SelectTrigger>
            <SelectContent>
              {lawyers.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={saving} disabled={!lawyerId}>
            Confirm reassignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
