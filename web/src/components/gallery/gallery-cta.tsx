import Link from "next/link";
import { ArrowRight, Camera } from "lucide-react";

import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function GalleryCta() {
  return (
    <Section tone="cream" size="sm">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-brand-100 bg-white/70 p-8 text-center shadow-soft backdrop-blur sm:p-12">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Camera className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-2xl text-ink-900 sm:text-3xl">
                We post the unedited kitchen every Friday
              </h2>
              <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink-600">
                Same room, same phone camera, no cleanup for the photo. Follow along on Instagram
                — or just order and judge for yourself.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/menu">
                  Order from the menu
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={siteConfig.social.instagram} target="_blank" rel="noreferrer">
                  Follow on Instagram
                </a>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
