"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const roles: { value: UserRole; label: string }[] = [
  { value: "paralegal", label: "Paralegal" },
  { value: "lawyer", label: "Lawyer" },
  { value: "admin", label: "Admin" },
];

function StepIndicator({ step }: { step: "details" | "otp" }) {
  const steps = [
    { key: "details", label: "Your details" },
    { key: "otp", label: "Verify email" },
  ];
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {steps.map((s, i) => {
        const done = step === "otp" && s.key === "details";
        const active = step === s.key;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium",
                done && "border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500",
                active && "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
                !done && !active && "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn("text-xs font-medium", active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="h-0.5 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />}
          </div>
        );
      })}
    </div>
  );
}

export default function RegisterPage() {
  const { requestRegistrationOtp, verifyRegistrationOtp } = useAuth();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("paralegal");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSendCode() {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const { expires_in_minutes } = await requestRegistrationOtp({
        full_name: fullName,
        email,
        password,
        role,
      });
      setInfo(`We sent a 4-digit code to ${email}. It expires in ${expires_in_minutes} minutes.`);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);
    setSubmitting(true);
    try {
      await verifyRegistrationOtp({
        full_name: fullName,
        email,
        password,
        role,
        otp_code: otpCode,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="gradient-mesh relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-glow">
            <Scale className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Create account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Join your firm&apos;s workspace</p>
        </div>

        <StepIndicator step={step} />

        <Card>
          <CardContent className="space-y-4 py-6">
            {error && (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                {error}
              </div>
            )}
            {info && step === "otp" && (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                {info}
              </div>
            )}

            {step === "details" ? (
              <>
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@firm.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleSendCode} loading={submitting}>
                  Send verification code
                </Button>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    maxLength={4}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="1234"
                    className="text-center text-lg tracking-[0.5em]"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleVerifyCode}
                  loading={submitting}
                  disabled={otpCode.length !== 4}
                >
                  Verify & create account
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-slate-500 hover:underline dark:text-slate-400"
                  onClick={() => {
                    setStep("details");
                    setOtpCode("");
                    setInfo(null);
                    setError(null);
                  }}
                >
                  Wrong email? Go back
                </button>
              </>
            )}

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
