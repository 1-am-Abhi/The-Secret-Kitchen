"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitContactEnquiry } from "@/lib/api";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  { value: "order", label: "A problem with an order" },
  { value: "tiffin", label: "Monthly tiffin plans" },
  { value: "bulk", label: "Bulk / office catering" },
  { value: "feedback", label: "Feedback or a compliment" },
  { value: "partnership", label: "Partnership or supply" },
  { value: "other", label: "Something else" },
] as const;

/**
 * Indian mobile numbers are exactly ten digits and always start 6–9. The regex
 * runs on a digit-stripped copy so people can type "+91 98765 43210",
 * "098765-43210" or "9876543210" and all three validate.
 */
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please tell us your name")
    .max(60, "That name is a little too long"),
  email: z.email("Enter a valid email address, e.g. you@example.com"),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
    .refine((digits) => INDIAN_MOBILE.test(digits), {
      message: "Enter a 10-digit Indian mobile number",
    }),
  subject: z.string().min(1, "Choose what this is about"),
  message: z
    .string()
    .trim()
    .min(10, "A little more detail helps us answer properly")
    .max(1000, "Please keep it under 1000 characters"),
});

type ContactValues = z.infer<typeof schema>;

/** Field-level error text + the aria wiring that connects it to its input. */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function ContactForm() {
  const [sent, setSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(schema),
    // onTouched: no red text while someone is still mid-word, but instant
    // re-validation once they have seen an error and are fixing it.
    mode: "onTouched",
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "" },
  });

  async function onSubmit(values: ContactValues) {
    try {
      await submitContactEnquiry(values);
      setSent(true);
      reset();
      toast.success("Message sent", {
        description: "We usually reply within two hours during kitchen hours.",
      });
    } catch {
      toast.error("That did not go through", {
        description: "Please try again, or reach us on WhatsApp — we are quicker there anyway.",
      });
    }
  }

  if (sent) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-fresh-200 bg-fresh-50/60 p-10 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-fresh-500 text-white shadow-soft">
          <CheckCircle2 className="size-8" aria-hidden />
        </span>
        <h2 className="mt-6 text-2xl text-ink-900">Thank you — that reached us</h2>
        <p className="mt-3 max-w-sm leading-relaxed text-ink-600">
          One of the team will get back to you within two hours during kitchen hours. If it is
          urgent, WhatsApp us and we will pick it up straight away.
        </p>
        <Button variant="outline" className="mt-8" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-soft sm:p-9"
      aria-labelledby="contact-form-heading"
    >
      <h2 id="contact-form-heading" className="text-2xl text-ink-900">
        Send us a message
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        All fields are required. We never share your number with anyone.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <Label htmlFor="contact-name">Your name</Label>
          <Input
            id="contact-name"
            autoComplete="name"
            placeholder="Ananya Sharma"
            className="mt-2"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="contact-name-error" message={errors.name?.message} />
        </div>

        <div className="sm:col-span-1">
          <Label htmlFor="contact-phone">Mobile number</Label>
          <Input
            id="contact-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="98765 43210"
            className="mt-2"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "contact-phone-error" : undefined}
            {...register("phone")}
          />
          <FieldError id="contact-phone-error" message={errors.phone?.message} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="contact-email">Email address</Label>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-2"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="contact-email-error" message={errors.email?.message} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="contact-subject">What is this about?</Label>
          {/* Radix Select is not a native input, so it needs a Controller to
              hand its value back to react-hook-form. */}
          <Controller
            control={control}
            name="subject"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="contact-subject"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  className={cn("mt-2", errors.subject && "border-destructive")}
                  aria-invalid={Boolean(errors.subject)}
                  aria-describedby={errors.subject ? "contact-subject-error" : undefined}
                >
                  <SelectValue placeholder="Choose a topic" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject.value} value={subject.value}>
                      {subject.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id="contact-subject-error" message={errors.subject?.message} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="contact-message">Your message</Label>
          <Textarea
            id="contact-message"
            rows={5}
            placeholder="Tell us what you need — order number, date and what happened if something went wrong."
            className="mt-2"
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            {...register("message")}
          />
          <FieldError id="contact-message-error" message={errors.message?.message} />
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-8 w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          <>
            <Send aria-hidden />
            Send message
          </>
        )}
      </Button>
    </form>
  );
}
