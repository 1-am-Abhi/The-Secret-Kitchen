import { ContactForm } from "@/components/contact/contact-form";
import { ContactHero } from "@/components/contact/contact-hero";
import { ContactInfo } from "@/components/contact/contact-info";
import { ContactMap } from "@/components/contact/contact-map";
import { DeliveryCoverage } from "@/components/contact/delivery-coverage";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion";
import { JsonLd } from "@/components/seo/json-ld";
import { fullAddress, siteConfig } from "@/config/site";
import { breadcrumbSchema, buildMetadata, localBusinessSchema } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact Us — Kitchen Address, Phone & Enquiries",
  description: `Get in touch with The Secret Kitchen at ${fullAddress}. Call or WhatsApp ${siteConfig.contact.phone}, email us, or send an enquiry about bulk catering, tiffin plans or an order. Kitchen open ${siteConfig.hours.display}.`,
  path: "/contact",
  keywords: [
    "contact The Secret Kitchen",
    "cloud kitchen Noida contact",
    "bulk catering enquiry Noida",
    "tiffin service phone number",
    "Sector 62 Noida food delivery",
  ],
});

export default function ContactPage() {
  return (
    <>
      {/* LocalBusiness data belongs on the page carrying the address and hours,
          so search engines associate the NAP details with this URL. */}
      <JsonLd
        data={[
          localBusinessSchema(),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
        ]}
      />

      <ContactHero />

      <Section size="sm" className="pt-4 lg:pt-6">
        <div className="container-page">
          <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
            <Reveal animation="left">
              <ContactForm />
            </Reveal>
            <Reveal animation="right" delay={0.1}>
              <ContactInfo />
            </Reveal>
          </div>
        </div>
      </Section>

      <ContactMap />
      <DeliveryCoverage />
    </>
  );
}
