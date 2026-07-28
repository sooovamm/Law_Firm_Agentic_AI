"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTime, toDateInput } from "@/components/scheduling/helpers";
import { api, ApiError } from "@/lib/api";
import type { AvailableSlot, Client, User } from "@/types";
import { cn } from "@/lib/utils";

interface BookingDialogProps {
  open: boolean;
  onClose: () => void;
  onBooked: () => void;
  lawyers: User[];
  clients: Client[];
}

export function BookingDialog({ open, onClose, onBooked, lawyers, clients }: BookingDialogProps) {
  const [lawyerId, setLawyerId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [date, setDate] = useState<string>(toDateInput(new Date()));
  const [duration, setDuration] = useState<number>(60);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    if (!lawyerId || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      // Send midday to avoid timezone edge cases when the server derives the day.
      const dayIso = new Date(`${date}T12:00:00`).toISOString();
      const resp = await api.getAvailability(Number(lawyerId), dayIso, duration);
      setSlots(resp.slots);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load availability");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [lawyerId, date, duration]);

  useEffect(() => {
    if (open) loadSlots();
  }, [open, loadSlots]);

  if (!open) return null;

  async function handleBook() {
    if (!lawyerId || !selectedSlot) return;
    setBooking(true);
    setError(null);
    try {
      await api.bookConsultation({
        lawyer_id: Number(lawyerId),
        scheduled_time: selectedSlot,
        duration_minutes: duration,
        client_id: clientId ? Number(clientId) : undefined,
      });
      onBooked();
      onClose();
      // Reset for next time.
      setSelectedSlot(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Booking failed");
      // Refresh slots in case the conflict was a race.
      loadSlots();
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-brand" />
            <h2 className="text-base font-semibold text-slate-900">Book Consultation</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lawyer</label>
              <Select value={lawyerId} onValueChange={setLawyerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lawyer" />
                </SelectTrigger>
                <SelectContent>
                  {lawyers.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Client (optional)
              </label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={date}
                min={toDateInput(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Duration</label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[30, 45, 60, 90].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Available slots */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Available slots
            </label>
            {!lawyerId ? (
              <p className="text-sm text-slate-400">Select a lawyer to see availability.</p>
            ) : loadingSlots ? (
              <p className="text-sm text-slate-400">Loading slots...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-slate-400">No open slots for this day.</p>
            ) : (
              <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    onClick={() => setSelectedSlot(s.start)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-sm transition-colors",
                      selectedSlot === s.start
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
          <Button variant="secondary" onClick={onClose} disabled={booking}>
            Cancel
          </Button>
          <Button onClick={handleBook} disabled={!selectedSlot || booking}>
            {booking ? "Booking..." : "Book"}
          </Button>
        </div>
      </div>
    </div>
  );
}
