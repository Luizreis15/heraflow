import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "uppercase border-primary/30 bg-primary/15 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:bg-primary/25",
        secondary: "uppercase border-white/10 bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        destructive: "uppercase border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "normal-case border-slate-500/35 bg-card/50 text-foreground hover:border-primary/30 hover:bg-muted/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
