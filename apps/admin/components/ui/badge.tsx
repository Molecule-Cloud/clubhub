import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        // Node-color variants map to the same semantic use as tailwind.config.ts's
        // node.* palette — status/category tags stay visually consistent with
        // charts and stat cards elsewhere in the dashboard.
        success: "border-transparent bg-node-emerald/15 text-node-emerald",
        pending: "border-transparent bg-node-amber/15 text-node-amber",
        info: "border-transparent bg-node-cyan/15 text-node-cyan",
        category: "border-transparent bg-node-violet/15 text-node-violet",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
