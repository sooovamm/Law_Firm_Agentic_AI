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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlotPicker } from "@/components/scheduling/slot-picker";
import { toDateInput } from "@/components/scheduling/helpers";
import { api, ApiError } from "@/lib/api";
import type { AvailableSlot, Client, User } from "@/types";

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
      setSelectedSlot(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Booking failed");
      loadSlots();
    } finally {
      setBooking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Book Consultation</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lawyer</Label>
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
              <Label>Client (optional)</Label>
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
              <Label htmlFor="booking-date">Date</Label>
              <Input
                id="booking-date"
                type="date"
                value={date}
                min={toDateInput(new Date())}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Duration</Label>
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

          <SlotPicker
            slots={slots}
            selected={selectedSlot}
            onSelect={setSelectedSlot}
            loading={loadingSlots}
            emptyHint={!lawyerId ? "Select a lawyer to see availability." : undefined}
          />
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={booking}>
            Cancel
          </Button>
          <Button onClick={handleBook} loading={booking} disabled={!selectedSlot}>
            Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
