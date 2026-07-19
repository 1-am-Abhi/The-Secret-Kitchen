import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { offers } from "@/data/offers";

import { OfferCard } from "./offer-card";

export function OffersGrid() {
  return (
    <Section tone="muted">
      <div className="container-page">
        <SectionHeading
          eyebrow="All live offers"
          title="Every code we are running right now"
          description="No hidden conditions and no expired codes left on the page — if it is listed here, it works at checkout today."
        />

        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
          {offers.map((offer) => (
            <StaggerItem key={offer.id}>
              <OfferCard offer={offer} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
