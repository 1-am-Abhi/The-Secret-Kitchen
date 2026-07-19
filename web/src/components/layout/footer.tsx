import Link from "next/link";
import { BadgeCheck, Clock, Mail, MapPin, Phone } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import {
  FacebookIcon,
  InstagramIcon,
  XIcon,
  YouTubeIcon,
} from "@/components/brand/social-icons";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { footerNav } from "@/config/navigation";
import { fullAddress, hasFssaiLicense, siteConfig, telLink } from "@/config/site";

const socialLinks = [
  { label: "Instagram", href: siteConfig.social.instagram, Icon: InstagramIcon },
  { label: "Facebook", href: siteConfig.social.facebook, Icon: FacebookIcon },
  { label: "X", href: siteConfig.social.x, Icon: XIcon },
  { label: "YouTube", href: siteConfig.social.youtube, Icon: YouTubeIcon },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-ink-900 text-ink-300">
      {/* Warm glow anchoring the brand colour in an otherwise dark surface. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-brand-500/20 blur-[120px]"
      />

      <div className="container-page relative py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand + newsletter */}
          <div className="lg:col-span-4">
            <Logo variant="light" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-400">
              A pure-veg cloud kitchen and monthly tiffin service. We cook the way
              home does — fresh every morning, measured oil, honest portions.
            </p>

            <div className="mt-6">
              <p className="text-sm font-medium text-white">Get the weekly menu</p>
              <p className="mt-1 text-xs text-ink-500">
                Next week&apos;s tiffin menu and subscriber-only offers. No spam.
              </p>
              <NewsletterForm className="mt-3" />
            </div>

            <ul className="mt-6 flex gap-2">
              {socialLinks.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${siteConfig.name} on ${label}`}
                    className="flex size-10 items-center justify-center rounded-full bg-white/5 text-ink-300 transition-all duration-300 hover:bg-brand-500 hover:text-white"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          <div className="grid gap-8 sm:grid-cols-3 lg:col-span-5">
            {footerNav.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h3 className="font-display text-base text-white">{group.title}</h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-ink-400 transition-colors hover:text-brand-300"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Contact block */}
          <div className="lg:col-span-3">
            <h3 className="font-display text-base text-white">Visit or call</h3>
            <ul className="mt-4 flex flex-col gap-4 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-400" />
                <span className="text-ink-400">{fullAddress}</span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-400" />
                <a
                  href={telLink()}
                  className="text-ink-400 transition-colors hover:text-brand-300"
                >
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-400" />
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="text-ink-400 transition-colors hover:text-brand-300"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-400" />
                <span className="text-ink-400">
                  {siteConfig.hours.display}
                  <span className="mt-1 block text-xs text-ink-500">
                    {siteConfig.hours.note}
                  </span>
                </span>
              </li>
            </ul>

            {hasFssaiLicense && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-2">
                <BadgeCheck className="size-4 text-fresh-400" />
                <span className="text-xs text-ink-400">
                  FSSAI Lic. {siteConfig.fssaiLicense}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500">
            © {year} {siteConfig.name}. All rights reserved. Made with care in{" "}
            {siteConfig.address.city}.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-500">
            <li>
              <Link href="/terms" className="transition-colors hover:text-brand-300">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="transition-colors hover:text-brand-300">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className="transition-colors hover:text-brand-300">
                Refunds
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
