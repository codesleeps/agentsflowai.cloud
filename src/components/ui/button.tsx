import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/client-lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary/10 backdrop-blur-md border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(255,0,255,0.3)]",
        destructive: "bg-destructive/10 backdrop-blur-md border border-destructive/30 text-destructive hover:bg-destructive/20 hover:border-destructive/50 hover:shadow-[0_0_15px_rgba(255,0,0,0.3)]",
        outline: "border border-white/10 bg-white/[0.02] backdrop-blur-md hover:bg-primary/10 hover:border-primary/30",
        secondary: "bg-secondary/10 backdrop-blur-md border border-secondary/30 text-secondary hover:bg-secondary/20 hover:border-secondary/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]",
        ghost: "hover:bg-white/[0.05] hover:backdrop-blur-md hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-none px-3",
        lg: "h-11 rounded-none px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
