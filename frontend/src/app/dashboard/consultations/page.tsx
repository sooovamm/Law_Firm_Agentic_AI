"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingDialog } from "@/components/scheduling/booking-dialog";
import { RescheduleDialog } from "@/components/scheduling/reschedule-dialog";
import { WeekCalendar } from "@/components/scheduling/week-calendar";
import { ConsultationDrawer } from "@/components/scheduling/consultation-drawer";
import { toDateInput } from "@/components/scheduling/helpers";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { Client, Consultation, User } from "@/types";

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function ConsultationsPage() {
  const { user } = useAuth();
  const canApprove = user?.role === "lawyer" || user?.role === "admin";

  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [lawyers, setLawyers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [booking, setBooking] = useState(false);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [rescheduling, setRescheduling] = useState<Consultation | null>(null);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listConsultations({
        start_from: weekStart.toISOString(),
        start_to: weekEnd.toISOString(),
      });
      setConsultations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load consultations");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  // Lawyers (best-effort; requires admin) and clients for the booking dialog.
  useEffect(() => {
    api
      .listUsers()
      .then((users) => setLawyers(users.filter((u) => u.role === "lawyer" || u.role === "admin")))
      .catch(() => {
        // Non-admins can't list users; fall back to self if they're a lawyer.
        if (user && (user.role === "lawyer" || user.role === "admin")) {
          setLawyers([{ id: user.id, full_name: user.full_name, email: user.email, role: user.role } as User]);
        }
      });
    api
      .listClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, [user]);

  const label = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(
    weekEnd.getTime() - 1,
  ).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  function shiftWeek(delta: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(startOfWeek(d));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Consultations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Schedule and manage client consultations.</p>
        </div>
        <Button onClick={() => setBooking(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Book Consultation
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => shiftWeek(-1)} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </span>
          <Button variant="ghost" onClick={() => shiftWeek(1)} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          Today
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            Loading schedule...
          </CardContent>
        </Card>
      ) : (
        <WeekCalendar weekStart={weekStart} consultations={consultations} onSelect={setSelected} />
      )}

      {booking && (
        <BookingDialog
          open={booking}
          onClose={() => setBooking(false)}
          onBooked={load}
          lawyers={lawyers}
          clients={clients}
        />
      )}

      {selected && !rescheduling && (
        <ConsultationDrawer
          consultation={selected}
          canApprove={canApprove}
          onClose={() => setSelected(null)}
          onChanged={load}
          onReschedule={() => setRescheduling(selected)}
        />
      )}

      {rescheduling && (
        <RescheduleDialog
          consultation={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={() => {
            setRescheduling(null);
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
