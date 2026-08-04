"use client";

import { useState } from "react";
import { Check, CheckCheck, Clock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import {
  consultationStatusVariant,
  formatDateTime,
} from "@/components/scheduling/helpers";
import { api, ApiError } from "@/lib/api";
import type { Consultation } from "@/types";

export function ConsultationDrawer({
  consultation,
  canApprove,
  onClose,
  onChanged,
  onReschedule,
}: {
  consultation: Consultation;
  canApprove: boolean;
  onClose: () => void;
  onChanged: () => void;
  onReschedule: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = consultation.status === "completed" || consultation.status === "cancelled";

  async function setStatus(status: string) {
    setBusy(true);
    setError(null);
    try {
      await api.updateConsultation(consultation.id, { status });
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await api.cancelConsultation(consultation.id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent size="md">
        <SheetHeader>
          <SheetTitle>Consultation</SheetTitle>
        </SheetHeader>

        <SheetBody className="space-y-4 text-sm">
          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Badge variant={consultationStatusVariant[consultation.status]}>{consultation.status}</Badge>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {consultation.duration_minutes} min
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">When</p>
            <p className="mt-0.5 text-slate-900 dark:text-slate-100">{formatDateTime(consultation.scheduled_time)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Lawyer</p>
              <p className="mt-0.5 text-slate-900 dark:text-slate-100">{consultation.lawyer_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Client</p>
              <p className="mt-0.5 text-slate-900 dark:text-slate-100">{consultation.client_name ?? "—"}</p>
            </div>
          </div>

          {consultation.case_title && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Case</p>
              <p className="mt-0.5 text-slate-900 dark:text-slate-100">{consultation.case_title}</p>
            </div>
          )}

          {consultation.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Notes</p>
              <p className="mt-0.5 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{consultation.notes}</p>
            </div>
          )}
        </SheetBody>

        {!isTerminal && (
          <SheetFooter className="flex-col items-stretch gap-2">
            {consultation.status === "pending" && canApprove && (
              <Button className="w-full" onClick={() => setStatus("confirmed")} disabled={busy}>
                <Check className="h-4 w-4" />
                Approve booking
              </Button>
            )}
            {consultation.status === "confirmed" && (
              <Button className="w-full" onClick={() => setStatus("completed")} disabled={busy}>
                <CheckCheck className="h-4 w-4" />
                Mark completed
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onReschedule} disabled={busy}>
                Reschedule
              </Button>
              <Button variant="danger" className="flex-1" onClick={cancel} disabled={busy}>
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </div>
            {consultation.status === "pending" && !canApprove && (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                Only a lawyer can approve this booking.
              </p>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
