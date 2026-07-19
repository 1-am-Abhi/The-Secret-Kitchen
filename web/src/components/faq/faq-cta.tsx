import { Mail, MessageCircle, Phone } from "lucide-react";

import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { siteConfig, telLink, whatsappLink } from "@/config/site";

export function FaqCta() {
  return (
    <Section tone="cream" size="sm">
      <div className="container-page">
        <Reveal animation="scale">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-7 rounded-3xl border border-brand-100 bg-white/75 p-8 text-center shadow-soft backdrop-blur sm:p-12">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-[var(--shadow-glow)]">
              <MessageCircle className="size-6" aria-hidden />
            </span>

            <div>
              <h2 className="text-2xl text-ink-900 sm:text-3xl">Still have a question?</h2>
              <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink-600">
                Allergies, a bulk order for forty people, a delivery that went wrong — message us
                and a person from the kitchen answers, usually within two hours during{" "}
                {siteConfig.hours.display.toLowerCase()}.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" variant="accent">
                <a
                  href={whatsappLink("Hi! I have a question that wasn't covered in your FAQ.")}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle aria-hidden />
                  WhatsApp us
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={telLink()}>
                  <Phone aria-hidden />
                  {siteConfig.contact.phone}
                </a>
              </Button>
            </div>

            <a
              href={`mailto:${siteConfig.contact.supportEmail}`}
              className="inline-flex items-center gap-2 text-sm text-ink-500 transition-colors hover:text-brand-600"
            >
              <Mail className="size-4" aria-hidden />
              Prefer email? {siteConfig.contact.supportEmail}
            </a>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
