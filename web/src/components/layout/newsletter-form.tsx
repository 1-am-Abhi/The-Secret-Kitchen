"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { subscribeToNewsletter } from "@/lib/api";

const schema = z.object({
  email: z.email("That does not look like a valid email"),
});

type FormValues = z.infer<typeof schema>;

/** Footer newsletter capture. Optimistic UI with an inline success state. */
export function NewsletterForm({ className }: { className?: string }) {
  const [done, setDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    try {
      await subscribeToNewsletter(email);
      setDone(true);
      toast.success("You're on the list!", {
        description: "Next week's menu lands in your inbox every Sunday.",
      });
    } catch {
      toast.error("Could not subscribe right now. Please try again.");
    }
  };

  if (done) {
    return (
      <p
        className={cn(
          "flex items-center gap-2 rounded-full bg-fresh-500/15 px-4 py-3 text-sm text-fresh-300",
          className,
        )}
      >
        <Check className="size-4" /> Subscribed — see you Sunday.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={className} noValidate>
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "newsletter-error" : undefined}
            className="h-11 w-full rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-ink-500 transition-colors focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
            {...register("email")}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          aria-label="Subscribe to the newsletter"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-all hover:bg-brand-600 disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </button>
      </div>
      {errors.email && (
        <p id="newsletter-error" role="alert" className="mt-2 text-xs text-red-400">
          {errors.email.message}
        </p>
      )}
    </form>
  );
}
