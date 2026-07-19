import { Copy, ShoppingBag, Tag } from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";

const steps = [
  {
    icon: Copy,
    title: "Copy the code",
    description:
      "Tap any code above and it lands on your clipboard. Nothing to sign up for and nothing to remember.",
  },
  {
    icon: ShoppingBag,
    title: "Fill your cart",
    description:
      "Add dishes from the menu or pick a tiffin plan. Check the minimum order on the offer — the cart tells you if you are short.",
  },
  {
    icon: Tag,
    title: "Paste it at checkout",
    description:
      "Drop the code into the coupon box on the payment step. The saving applies to your bill instantly, before you pay.",
  },
];

export function HowToRedeem() {
  return (
    <Section>
      <div className="container-page">
        <SectionHeading
          eyebrow="Redeeming a code"
          title="Three taps between you and the discount"
          description="One code per order. If a code will not apply, the checkout tells you exactly why rather than failing silently."
        />

        <Stagger className="mt-14 grid gap-6 md:grid-cols-3" stagger={0.1}>
          {steps.map((step, index) => (
            <StaggerItem key={step.title} className="relative">
              {/* Connector line between steps on desktop only — decorative. */}
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[calc(50%+3rem)] top-8 hidden h-px w-[calc(100%-6rem)] bg-gradient-to-r from-brand-200 to-transparent md:block"
                />
              )}
              <div className="relative flex flex-col items-center text-center">
                <span className="relative inline-flex size-16 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-[var(--shadow-glow)]">
                  <step.icon className="size-6" aria-hidden />
                  <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border-2 border-white bg-ink-900 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                </span>
                <h3 className="mt-6 text-xl text-ink-900">{step.title}</h3>
                <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-ink-600">
                  {step.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
