"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { WizardShell, STEP_LABELS } from "@/components/onboarding/wizard-shell";
import { StepBasicInfo } from "@/components/onboarding/step-basic-info";
import { StepProfessionalInfo } from "@/components/onboarding/step-professional-info";
import { StepExperience } from "@/components/onboarding/step-experience";
import { StepPreferences } from "@/components/onboarding/step-preferences";
import { StepReview } from "@/components/onboarding/step-review";
import { api, ApiError } from "@/lib/api";
import { toLawyerProfileInput } from "@/lib/lawyer-profile";
import type { LawyerProfileInput } from "@/types";

function validateStep(step: number, data: LawyerProfileInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0) {
    if (data.years_of_experience == null) errors.years_of_experience = "Years of experience is required";
    else if (data.years_of_experience < 0 || data.years_of_experience > 70)
      errors.years_of_experience = "Enter a realistic number of years (0-70)";
    if (!data.languages_spoken || data.languages_spoken.length === 0)
      errors.languages_spoken = "At least one language is required";
  }
  if (step === 1) {
    if (!data.primary_practice_area) errors.primary_practice_area = "Primary practice area is required";
    if (!data.bar_registration_number) errors.bar_registration_number = "Bar registration number is required";
  }
  if (step === 2) {
    const total = data.total_cases_handled ?? 0;
    if ((data.total_cases_won ?? 0) > total) errors.total_cases_won = "Cases won cannot exceed total cases";
    if ((data.total_cases_lost ?? 0) > total) errors.total_cases_lost = "Cases lost cannot exceed total cases";
  }
  if (step === 3) {
    if (
      data.minimum_case_value != null &&
      data.maximum_case_value != null &&
      data.minimum_case_value > data.maximum_case_value
    ) {
      errors.maximum_case_value = "Maximum case value must be at least the minimum";
    }
  }
  return errors;
}

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<LawyerProfileInput>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "lawyer") {
      router.replace("/dashboard");
      return;
    }

    let active = true;
    (async () => {
      try {
        const status = await api.getLawyerStatus();
        if (status.onboarding_completed) {
          router.replace("/dashboard");
          return;
        }
        if (status.has_profile) {
          const profile = await api.getMyLawyerProfile();
          if (active) setData(toLawyerProfileInput(profile));
        }
      } catch {
        // No draft yet; start from a blank form.
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, router]);

  // Debounced autosave whenever the draft changes.
  useEffect(() => {
    if (!ready) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.saveLawyerDraft(data);
      } catch {
        // Autosave failures are non-blocking; the user can still submit manually.
      } finally {
        setSaving(false);
      }
    }, 1000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ready]);

  const isLastStep = step === STEP_LABELS.length - 1;

  function updateData(patch: Partial<LawyerProfileInput>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function handleNext() {
    const stepErrors = validateStep(step, data);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function handleBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleEdit(target: number) {
    setErrors({});
    setStep(target);
  }

  async function handleSubmit() {
    const stepErrors = { ...validateStep(0, data), ...validateStep(1, data), ...validateStep(2, data), ...validateStep(3, data) };
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast({ title: "Please fix the highlighted fields", variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      await api.completeLawyerOnboarding(data);
      toast({ title: "Profile complete", description: "Welcome to your dashboard.", variant: "success" });
      router.push("/dashboard");
    } catch (err) {
      toast({
        title: "Could not complete onboarding",
        description: err instanceof ApiError ? err.detail : "Something went wrong",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const stepComponent = useMemo(() => {
    switch (step) {
      case 0:
        return <StepBasicInfo data={data} onChange={updateData} errors={errors} />;
      case 1:
        return <StepProfessionalInfo data={data} onChange={updateData} errors={errors} />;
      case 2:
        return <StepExperience data={data} onChange={updateData} errors={errors} />;
      case 3:
        return <StepPreferences data={data} onChange={updateData} errors={errors} />;
      default:
        return <StepReview data={data} onEdit={handleEdit} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, data, errors]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="gradient-mesh relative min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="mx-auto mb-8 flex max-w-2xl items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-glow">
          <Scale className="h-4.5 w-4.5" strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Legal CMS</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">AI Workspace</p>
        </div>
      </div>

      <WizardShell step={step} saving={saving}>
        {stepComponent}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 0}>
            Back
          </Button>
          {isLastStep ? (
            <Button onClick={handleSubmit} loading={submitting}>
              Complete onboarding
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </div>
      </WizardShell>
    </div>
  );
}
