import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-50 text-brand-700",
        veg: "border-fresh-500/30 bg-fresh-50 text-fresh-700",
        bestseller: "border-transparent bg-brand-500 text-white shadow-soft",
        new: "border-transparent bg-ink-800 text-white",
        outline: "border-ink-200 bg-white text-ink-600",
        muted: "border-transparent bg-ink-100 text-ink-600",
        success: "border-transparent bg-fresh-100 text-fresh-700",
        warning: "border-transparent bg-amber-100 text-amber-700",
        danger: "border-transparent bg-red-100 text-red-700",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3.5 py-1.5 text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

/**
 * The green square-in-square mark that Indian food regulations use to denote a
 * vegetarian product. Rendered as pure CSS so it stays crisp at any size.
 */
function VegMark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Vegetarian"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] border-fresh-600 bg-white",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-fresh-600" />
    </span>
  );
}

export { Badge, badgeVariants, VegMark };
