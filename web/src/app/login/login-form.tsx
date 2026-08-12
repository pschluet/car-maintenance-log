"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

type Step = "email" | "code";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong. Try again.");
      }
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Something went wrong. Try again.");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={handleStart} className="space-y-4">
        <Field label="Email address" htmlFor="email" error={error}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Sending code…" : "Send sign-in code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <p className="text-sm text-ink-muted">
        We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>.
      </p>
      <Field label="Verification code" htmlFor="code" error={error}>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          maxLength={6}
          pattern="\d{6}"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          className="text-center text-lg tracking-[0.4em]"
        />
      </Field>
      <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
        {submitting ? "Verifying…" : "Sign in"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setStep("email");
          setCode("");
          setError(undefined);
        }}
        className="w-full text-center text-sm text-ink-muted underline-offset-2 hover:underline"
      >
        Use a different email
      </button>
    </form>
  );
}
