"use client";

import { useState } from "react";
import { apiFetch, apiJson } from "@/lib/apiClient";
import type { CognitoUserSummary } from "@/lib/cognito";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Field, Input } from "./ui/input";

export function AdminUsersManager({
  initialUsers,
  currentUserEmail,
}: {
  initialUsers: CognitoUserSummary[];
  currentUserEmail: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const { users: fresh } = await apiJson<{ users: CognitoUserSummary[] }>("/api/admin/users");
    setUsers(fresh);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      await apiJson("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ email, isAdmin }),
      });
      setEmail("");
      setIsAdmin(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add user");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(userEmail: string) {
    await apiFetch(`/api/admin/users/${encodeURIComponent(userEmail)}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="mb-3 font-medium text-ink">Add a user</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Email" htmlFor="new-user-email" error={error}>
            <Input
              id="new-user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="them@example.com"
            />
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Grant admin access
          </label>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Adding…" : "Add user"}
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 font-medium text-ink">Users</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.sub} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">{u.email}</p>
                <p className="text-xs text-ink-muted">
                  {u.status} {u.isAdmin && "· Admin"}
                </p>
              </div>
              {u.email.toLowerCase() !== currentUserEmail.toLowerCase() && (
                <button
                  type="button"
                  onClick={() => handleRemove(u.email)}
                  className="text-sm text-ink-muted hover:text-danger"
                >
                  Remove
                </button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
