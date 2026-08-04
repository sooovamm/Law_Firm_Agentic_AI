"use client";

import { useState } from "react";
import Link from "next/link";
import { Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="gradient-mesh relative flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-glow">
            <Scale className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Legal CMS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to your account</p>
        </div>

        <Card>
          <CardContent className="space-y-4 py-7">
            {error && (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="********"
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} loading={submitting}>
              Sign in
            </Button>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              No account?{" "}
              <Link href="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
