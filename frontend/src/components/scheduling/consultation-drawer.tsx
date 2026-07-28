"use client";

import { useState } from "react";
import { Check, CheckCheck, Clock, X, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const isTerminal =
    consultation.status === "completed" || consultation.status === "cancelled";

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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Consultation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-red-700">{error}</div>
          )}

          <div className="flex items-center gap-2">
            <Badge variant={consultationStatusVariant[consultation.status]}>
              {consultation.status}
            </Badge>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {consultation.duration_minutes} min
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">When</p>
            <p className="mt-0.5 text-slate-900">{formatDateTime(consultation.scheduled_time)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Lawyer</p>
              <p className="mt-0.5 text-slate-900">{consultation.lawyer_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Client</p>
              <p className="mt-0.5 text-slate-900">{consultation.client_name ?? "—"}</p>
            </div>
          </div>

          {consultation.case_title && (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Case</p>
              <p className="mt-0.5 text-slate-900">{consultation.case_title}</p>
            </div>
          )}

          {consultation.notes && (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Notes</p>
              <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{consultation.notes}</p>
            </div>
          )}
        </div>

        {!isTerminal && (
          <div className="space-y-2 border-t border-slate-100 px-5 py-4">
            {consultation.status === "pending" && canApprove && (
              <Button className="w-full" onClick={() => setStatus("confirmed")} disabled={busy}>
                <Check className="mr-1.5 h-4 w-4" />
                Approve booking
              </Button>
            )}
            {consultation.status === "confirmed" && (
              <Button className="w-full" onClick={() => setStatus("completed")} disabled={busy}>
                <CheckCheck className="mr-1.5 h-4 w-4" />
                Mark completed
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onReschedule} disabled={busy}>
                Reschedule
              </Button>
              <Button variant="danger" className="flex-1" onClick={cancel} disabled={busy}>
                <XCircle className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
            </div>
            {consultation.status === "pending" && !canApprove && (
              <p className="text-center text-xs text-slate-400">
                Only a lawyer can approve this booking.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
