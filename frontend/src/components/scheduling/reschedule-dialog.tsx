"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTime, toDateInput } from "@/components/scheduling/helpers";
import { api, ApiError } from "@/lib/api";
import type { AvailableSlot, Consultation } from "@/types";
import { cn } from "@/lib/utils";

export function RescheduleDialog({
  consultation,
  onClose,
  onDone,
}: {
  consultation: Consultation;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState<string>(
    toDateInput(new Date(consultation.scheduled_time)),
  );
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
      const resp = await api.getAvailability(
        consultation.lawyer_id,
        dayIso,
        consultation.duration_minutes,
      );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-brand" />
            <h2 className="text-base font-semibold text-slate-900">Reschedule</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New date</label>
            <input
              type="date"
              value={date}
              min={toDateInput(new Date())}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Available slots
            </label>
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-slate-400">No open slots for this day.</p>
            ) : (
              <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    onClick={() => setSelected(s.start)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-sm transition-colors",
                      selected === s.start
                        ? "border-brand bg-brand text-white"
                        : "border-slate-300 text-slate-700 hover:border-brand hover:text-brand",
                    )}
                  >
                    {formatTime(s.start)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} disabled={!selected || saving}>
            {saving ? "Saving..." : "Reschedule"}
          </Button>
        </div>
      </div>
    </div>
  );
}
