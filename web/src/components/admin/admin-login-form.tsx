"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, LogIn } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAdmin } from "@/lib/admin-auth";
import { ADMIN_LOGIN_PATH, setAdminToken } from "@/lib/admin-orders";
import { adminLoginSchema, type AdminLoginValues } from "@/lib/validation";

const ADMIN_HOME = "/admin";

/**
 * Where to send the operator after a successful sign-in.
 *
 * Only same-origin admin paths are honoured. `//evil.example` and
 * `/\evil.example` are browser-legal protocol-relative URLs that pass a naive
 * `startsWith("/admin")` check on some parsers, so they are rejected outright —
 * an open redirect on a login screen is a phishing primitive.
 */
export function safeNextPath(next: string | null): string {
  if (!next) return ADMIN_HOME;
  if (!next.startsWith("/admin")) return ADMIN_HOME;
  if (next.startsWith("//") || next.startsWith("/\\")) return ADMIN_HOME;
  // Never bounce straight back to the screen we are leaving.
  if (next === ADMIN_LOGIN_PATH || next.startsWith(`${ADMIN_LOGIN_PATH}?`)) return ADMIN_HOME;
  return next;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  // Held separately from `isSubmitting`: the router navigation continues after
  // the promise resolves, and dropping back to "Sign in" for that beat looks
  // like the click did nothing.
  const [redirecting, setRedirecting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const busy = isSubmitting || redirecting;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const result = await loginAdmin(values.email.trim(), values.password);

    if (!result.ok) {
      // `loginAdmin` already distinguishes wrong credentials from rate limiting
      // from an unreachable/unconfigured API, and phrases each honestly. The
      // form keeps every field as typed — retyping an email after one wrong
      // password is pure friction.
      setFormError(result.message);
      return;
    }

    setAdminToken(result.token);
    setRedirecting(true);
    router.replace(safeNextPath(searchParams.get("next")));
  });

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ink-900 px-5 py-12">
      <div className="w-full max-w-[26rem]">
        <div className="mb-7 flex justify-center">
          <Logo variant="light" href={null} />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-float sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl leading-tight tracking-tight text-ink-900">
              Admin Portal
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              Sign in to manage orders, menu and customers.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/8 px-3.5 py-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <Label htmlFor="admin-email">Email address</Label>
              <Input
                id="admin-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoFocus
                placeholder="you@thesecretkitchen.in"
                className="mt-2"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "admin-email-error" : undefined}
                disabled={busy}
                {...register("email")}
              />
              <FieldError id="admin-email-error" message={errors.email?.message} />
            </div>

            <div>
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative mt-2">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-12"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "admin-password-error" : undefined}
                  disabled={busy}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              <FieldError id="admin-password-error" message={errors.password?.message} />
            </div>

            <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
              {busy ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  {redirecting ? "Signing you in…" : "Checking…"}
                </>
              ) : (
                <>
                  <LogIn aria-hidden />
                  Sign in
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to the storefront
          </Link>
        </div>
      </div>
    </main>
  );
}
