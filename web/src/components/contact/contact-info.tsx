import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fullAddress, hasFssaiLicense, siteConfig, telLink, whatsappLink } from "@/config/site";

/**
 * The info panel. Every value comes from siteConfig so a change of outlet or
 * phone number is one edit in one file, never a search across components.
 */
export function ContactInfo() {
  const { contact, hours, address } = siteConfig;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-2xl text-ink-900">Reach us directly</h2>
        <p className="mt-2 text-sm text-ink-500">
          Fastest on WhatsApp — the kitchen phone is answered between services.
        </p>

        <dl className="mt-7 space-y-6">
          <div className="flex gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <MapPin className="size-5" aria-hidden />
            </span>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
                Kitchen address
              </dt>
              <dd className="mt-1.5 leading-relaxed text-ink-800">
                <address className="not-italic">
                  {address.line1}
                  <br />
                  {address.line2}, {address.state} {address.postalCode}
                </address>
              </dd>
            </div>
          </div>

          <div className="flex gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Phone className="size-5" aria-hidden />
            </span>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
                Phone &amp; WhatsApp
              </dt>
              <dd className="mt-1.5">
                <a
                  href={telLink()}
                  className="text-ink-800 transition-colors hover:text-brand-600"
                >
                  {contact.phone}
                </a>
              </dd>
            </div>
          </div>

          <div className="flex gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Mail className="size-5" aria-hidden />
            </span>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
                Email
              </dt>
              <dd className="mt-1.5 space-y-1">
                <a
                  href={`mailto:${contact.email}`}
                  className="block text-ink-800 transition-colors hover:text-brand-600"
                >
                  {contact.email}
                </a>
                <a
                  href={`mailto:${contact.supportEmail}`}
                  className="block text-sm text-ink-500 transition-colors hover:text-brand-600"
                >
                  {contact.supportEmail} · order issues
                </a>
              </dd>
            </div>
          </div>

          <div className="flex gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Clock className="size-5" aria-hidden />
            </span>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
                Kitchen hours
              </dt>
              <dd className="mt-1.5 space-y-1 text-ink-800">
                <p>
                  {hours.weekday.label}: {hours.weekday.open} – {hours.weekday.close}
                </p>
                <p>
                  {hours.weekend.label}: {hours.weekend.open} – {hours.weekend.close}
                </p>
                <p className="pt-1 text-sm leading-relaxed text-ink-500">{hours.note}</p>
              </dd>
            </div>
          </div>
        </dl>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button asChild variant="accent">
            <a
              href={whatsappLink(`Hi ${siteConfig.name}! I have a question.`)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle aria-hidden />
              WhatsApp us
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={telLink()}>
              <Phone aria-hidden />
              Call the kitchen
            </a>
          </Button>
        </div>
      </div>

      <p className="px-2 text-xs leading-relaxed text-ink-400">
        {siteConfig.name}
        {hasFssaiLicense && ` · FSSAI licence no. ${siteConfig.fssaiLicense}`} · {fullAddress}
      </p>
    </div>
  );
}
