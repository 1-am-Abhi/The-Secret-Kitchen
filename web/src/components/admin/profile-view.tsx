"use client";

import { UserRound } from "lucide-react";
import * as React from "react";

import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { useAdminSession } from "@/components/admin/admin-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeAdminPassword, formatAdminRole } from "@/lib/admin-auth";
import { getAdminToken } from "@/lib/admin-orders";

/**
 * The signed-in operator's own account.
 *
 * Everything shown here comes from the session the guard already verified
 * against GET /auth/me — nothing is invented, and there is no editing of name,
 * email or role because the API exposes no endpoint for it. Offering fields
 * that silently discard what you type would be worse than not offering them.
 */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ink-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="truncate text-sm font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setDone(false);

    // Checked here only because the server never receives the confirmation
    // field; every other rule is the server's to enforce and report.
    if (next !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }

    const token = getAdminToken();
    if (!token) {
      setError("Your session has expired. Sign in again to change your password.");
      return;
    }

    setBusy(true);
    const result = await changeAdminPassword(token, current, next);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setDone(true);
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  return (
    <section className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-ink-900">Change password</h2>
      <p className="mt-1 text-sm text-ink-500">
        Your current password is re-checked by the server, so a stolen session alone cannot
        change it.
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <p className="text-xs text-ink-500">At least 10 characters.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="text-sm font-medium text-green-700">
            Password changed. Your current session stays signed in.
          </p>
        )}

        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Changing…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function ProfileView() {
  const session = useAdminSession();

  if (!session) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow="Account" title="Profile" />
        <EmptyState
          icon={UserRound}
          title="No active session"
          description="This panel is running without a configured admin API, so there is no account to show."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your account as the API reports it."
      />

      <section className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink-900">Account details</h2>
        <dl className="mt-3">
          <Field label="Name" value={session.name} />
          <Field label="Email address" value={session.email} />
          <Field label="Role" value={formatAdminRole(session.role)} />
        </dl>
        <p className="mt-4 text-xs text-ink-500">
          Name, email and role are set when the account is created and can only be changed by a
          database administrator — the API exposes no endpoint for editing them.
        </p>
      </section>

      <ChangePasswordCard />
    </div>
  );
}
