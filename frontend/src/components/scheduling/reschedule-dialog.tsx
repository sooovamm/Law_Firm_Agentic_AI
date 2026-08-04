"use client";

import { useCallback, useEffect, useState } from "react";

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
import { SlotPicker } from "@/components/scheduling/slot-picker";
import { toDateInput } from "@/components/scheduling/helpers";
import { api, ApiError } from "@/lib/api";
import type { AvailableSlot, Consultation } from "@/types";

export function RescheduleDialog({
  consultation,
  onClose,
  onDone,
}: {
  consultation: Consultation;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState<string>(toDateInput(new Date(consultation.scheduled_time)));
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    try {
      const dayIso = new Date(`${date}T12:00:00`).toISOString();
      const resp = await api.getAvailability(consultation.lawyer_id, dayIso, consultation.duration_minutes);
      setSlots(resp.slots);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load availability");
    } finally {
      setLoading(false);
    }
  }, [date, consultation.lawyer_id, consultation.duration_minutes]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  async function handleReschedule() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateConsultation(consultation.id, { scheduled_time: selected });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Reschedule failed");
      loadSlots();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reschedule</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="reschedule-date">New date</Label>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              min={toDateInput(new Date())}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <SlotPicker slots={slots} selected={selected} onSelect={setSelected} loading={loading} />
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} loading={saving} disabled={!selected}>
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
