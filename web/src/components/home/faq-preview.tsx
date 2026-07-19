import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getHomepageFaqs } from "@/data/faq";
import { telLink, whatsappLink } from "@/config/site";

export function FaqPreview() {
  const faqs = getHomepageFaqs();

  return (
    <Section tone="cream">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              align="left"
              eyebrow="Questions"
              title="Everything you were about to ask"
              description="The six we get asked most. There are plenty more on the full FAQ page."
            />

            <Reveal delay={0.2}>
              <div className="mt-8 rounded-3xl border border-ink-200/70 bg-white p-6">
                <p className="font-display text-lg text-ink-900">Still unsure?</p>
                <p className="mt-1.5 text-sm text-ink-500">
                  Talk to a real person — usually Meenakshi or Imran. We reply
                  within minutes during kitchen hours.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button asChild variant="accent" size="sm">
                    <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                      <MessageCircle />
                      WhatsApp us
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={telLink()}>
                      <Phone />
                      Call the kitchen
                    </a>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal animation="right">
              <Accordion type="single" collapsible className="flex flex-col gap-3">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>

            <Reveal delay={0.15}>
              <Link
                href="/faq"
                className="-my-2 mt-6 inline-flex min-h-8 items-center py-2 text-sm font-semibold text-brand-600 underline-offset-4 hover:underline"
              >
                Read all 22 questions →
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </Section>
  );
}
