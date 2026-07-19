import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { whatsappLink } from "@/config/site";

export function ClosingCta() {
  return (
    <Section size="sm">
      <div className="container-page">
        <Reveal animation="scale">
          <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-7 py-14 text-center shadow-float sm:px-12 lg:px-16 lg:py-20">
            <div aria-hidden className="absolute inset-0 opacity-25">
              <FoodImage
                imageId="hero-2"
                alt=""
                sizes="100vw"
                className="object-cover"
              />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/85 to-ink-900/60"
            />

            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-3xl leading-tight text-white sm:text-4xl lg:text-[2.75rem]">
                Come taste the difference one honest kitchen makes
              </h2>
              <p className="mt-5 text-base leading-relaxed text-ink-300 sm:text-lg">
                Order a single meal to try us, or start a monthly tiffin and stop thinking about
                dinner altogether. Either way, the dal is tasted before it leaves.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/tiffin">
                    See tiffin plans
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="glass" className="w-full sm:w-auto">
                  <a href={whatsappLink("Hi! I just read your story — I'd like to try a meal.")} target="_blank" rel="noreferrer">
                    <MessageCircle />
                    Chat on WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
