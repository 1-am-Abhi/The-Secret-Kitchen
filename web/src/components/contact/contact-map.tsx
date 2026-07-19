import { Navigation } from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import {
  fullAddress,
  mapsDirectionsUrl,
  mapsEmbedUrl,
  siteConfig,
} from "@/config/site";

export function ContactMap() {
  return (
    <Section tone="muted">
      <div className="container-page">
        <SectionHeading
          align="left"
          eyebrow="Find us"
          title="Sector 62, Noida — walk-in pickup welcome"
          description={`${fullAddress}. Collection saves you the delivery fee and the food is handed over straight off the pass.`}
          action={{ label: "Open in Google Maps", href: mapsDirectionsUrl() }}
        />

        <Reveal animation="scale" className="mt-10">
          <div className="overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-lift">
            <iframe
              // A titled iframe is what screen readers announce in the tab order;
              // without it the frame is read as an unlabelled region.
              title={`Google Map showing the location of ${siteConfig.name} at ${fullAddress}`}
              src={mapsEmbedUrl()}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="h-[22rem] w-full border-0 sm:h-[26rem] lg:h-[30rem]"
            />
            <div className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink-900">{siteConfig.name}</p>
                <p className="mt-0.5 text-sm text-ink-500">{fullAddress}</p>
              </div>
              <Button asChild variant="outline">
                <a href={mapsDirectionsUrl()} target="_blank" rel="noreferrer">
                  <Navigation aria-hidden />
                  Get directions
                </a>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
