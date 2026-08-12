import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-3xl">🔧</div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Car Maintenance Log</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Sign in with your email — no password needed.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
