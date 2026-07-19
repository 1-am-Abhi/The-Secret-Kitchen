"use client";

import * as React from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Shared motion vocabulary.
 *
 * Every animation in the product composes from these primitives so timing,
 * easing and distance stay consistent site-wide. All of them honour the user's
 * reduce-motion preference by collapsing to a plain fade or no motion at all.
 */

/** Matches --ease-out-expo in globals.css. */
const EASE = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

const VARIANTS = {
  "fade-up": fadeUp,
  fade: fadeIn,
  scale: scaleIn,
  left: slideInLeft,
  right: slideInRight,
} as const;

export type RevealAnimation = keyof typeof VARIANTS;

/**
 * React's drag and animation DOM events collide with Framer Motion's
 * same-named props, which take different signatures. Stripping them keeps the
 * wrapper components assignable to motion's prop types.
 */
type MotionSafeProps<T extends HTMLElement> = Omit<
  React.HTMLAttributes<T>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
>;

interface RevealProps extends MotionSafeProps<HTMLDivElement> {
  animation?: RevealAnimation;
  /** Seconds to wait before the animation starts. */
  delay?: number;
  /** How much of the element must be visible before it triggers (0-1). */
  amount?: number;
  as?: "div" | "section" | "article" | "li" | "span";
}

/**
 * Animates its children into view once, the first time they are scrolled to.
 * `once: true` prevents the distracting re-animation on scroll-up.
 */
export function Reveal({
  animation = "fade-up",
  delay = 0,
  amount = 0.25,
  as = "div",
  className,
  children,
  ...props
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount, margin: "0px 0px -80px 0px" });
  const shouldReduceMotion = useReducedMotion();

  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={shouldReduceMotion ? VARIANTS.fade : VARIANTS[animation]}
      transition={{ delay }}
      className={className}
      // Reveal elements start at opacity 0, so without JavaScript they would
      // never become visible. This marker lets a <noscript> rule force them
      // back on — see the noscript block in the root layout.
      data-reveal=""
      {...props}
    >
      {children}
    </MotionTag>
  );
}

interface StaggerProps extends MotionSafeProps<HTMLDivElement> {
  /** Gap in seconds between each child's animation. */
  stagger?: number;
  delay?: number;
  amount?: number;
  as?: "div" | "ul" | "section";
}

/**
 * Parent that reveals its `<StaggerItem>` children one after another. Use for
 * card grids so the row assembles rather than popping in all at once.
 */
export function Stagger({
  stagger = 0.08,
  delay = 0,
  amount = 0.15,
  as = "div",
  className,
  children,
  ...props
}: StaggerProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount, margin: "0px 0px -60px 0px" });

  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      className={className}
      data-reveal=""
      {...props}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerItem({
  animation = "fade-up",
  className,
  children,
  ...props
}: MotionSafeProps<HTMLDivElement> & { animation?: RevealAnimation }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      variants={shouldReduceMotion ? VARIANTS.fade : VARIANTS[animation]}
      className={className}
      data-reveal=""
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Moves its children at a different rate to the page scroll. `speed` is the
 * fraction of the scrolled distance to offset by — negative moves upward.
 */
export function Parallax({
  speed = 0.2,
  className,
  children,
}: {
  speed?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${speed * 100}%`]);

  if (shouldReduceMotion) return <div className={className}>{children}</div>;

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/**
 * Counts up to `value` when scrolled into view. Used for the stat strip.
 * Driven by a spring so the number decelerates rather than ticking linearly.
 */
export function CountUp({
  value,
  duration = 1.6,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const shouldReduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, motionValue, value]);

  React.useEffect(() => spring.on("change", setDisplay), [spring]);

  // A non-finite `value` (undefined from an API that dropped a field, or NaN
  // from a bad division upstream) must degrade to a dash rather than throw and
  // take down the whole page from inside a presentational component.
  const target = Number.isFinite(value) ? value : null;
  const shown = shouldReduceMotion ? target : Number.isFinite(display) ? display : target;

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown === null ? "—" : shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/**
 * Infinite horizontal marquee. Children are rendered twice so the loop is
 * seamless; the duplicate is hidden from assistive technology.
 */
export function Marquee({
  children,
  speed = 40,
  className,
  pauseOnHover = true,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
  pauseOnHover?: boolean;
}) {
  return (
    <div className={cn("group relative flex overflow-hidden", className)}>
      <div
        className={cn(
          "flex w-max animate-[marquee_var(--marquee-duration)_linear_infinite]",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
        )}
        style={{ "--marquee-duration": `${speed}s` } as React.CSSProperties}
      >
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Gentle continuous float — for decorative cards and badges only. */
export function Floating({
  children,
  className,
  delay = 0,
  distance = 14,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export { motion, useReducedMotion };
