import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base: pill geometry, spring-eased press feedback, disabled + icon handling.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-300 ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-500 text-white shadow-[var(--shadow-glow)] hover:bg-brand-600 hover:shadow-[0_16px_48px_-8px_rgb(255_107_0/0.55)] hover:-translate-y-0.5",
        secondary:
          "bg-ink-800 text-white shadow-soft hover:bg-ink-900 hover:-translate-y-0.5 hover:shadow-lift",
        accent:
          "bg-fresh-500 text-white shadow-soft hover:bg-fresh-600 hover:-translate-y-0.5 hover:shadow-lift",
        outline:
          "border border-ink-200 bg-white text-ink-800 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
        ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
        glass: "glass text-ink-800 shadow-soft hover:bg-white/90 hover:shadow-lift",
        link: "text-brand-600 underline-offset-4 hover:underline hover:text-brand-700",
        destructive: "bg-destructive text-white shadow-soft hover:brightness-95",
      },
      size: {
        sm: "h-9 px-4 text-sm [&_svg]:size-4",
        md: "h-11 px-6 text-sm [&_svg]:size-4",
        lg: "h-13 px-8 text-base [&_svg]:size-5",
        xl: "h-15 px-10 text-base [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
        "icon-sm": "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the single child element instead of a <button> (e.g. a Link). */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
