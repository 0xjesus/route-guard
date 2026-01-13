"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2
   font-medium transition-all duration-200 ease-out
   disabled:opacity-50 disabled:cursor-not-allowed
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-mantle-bg-primary`,
  {
    variants: {
      variant: {
        primary: `
          bg-gradient-to-r from-mantle-accent to-mantle-accent-dark
          text-mantle-black font-semibold
          hover:shadow-glow-accent hover:scale-[1.02]
          active:scale-[0.98]
          focus-visible:ring-mantle-accent
        `,
        secondary: `
          bg-mantle-bg-elevated border border-mantle-bg-elevated
          text-mantle-text-primary
          hover:border-mantle-accent/50 hover:bg-mantle-bg-tertiary
          active:scale-[0.98]
          focus-visible:ring-mantle-accent
        `,
        ghost: `
          text-mantle-text-secondary
          hover:text-mantle-text-primary hover:bg-mantle-bg-tertiary
          active:bg-mantle-bg-elevated
        `,
        danger: `
          bg-mantle-error/10 border border-mantle-error/30
          text-mantle-error
          hover:bg-mantle-error/20
          active:scale-[0.98]
          focus-visible:ring-mantle-error
        `,
        success: `
          bg-mantle-success text-white font-semibold
          hover:bg-mantle-success/90
          active:scale-[0.98]
          focus-visible:ring-mantle-success
        `,
      },
      size: {
        sm: "px-3 py-1.5 text-label-md rounded-lg",
        md: "px-4 py-2.5 text-body-sm rounded-xl",
        lg: "px-6 py-3 text-body-md rounded-xl",
        xl: "px-8 py-4 text-body-lg rounded-2xl",
        icon: "p-2.5 rounded-xl",
        "icon-sm": "p-2 rounded-lg",
        "icon-lg": "p-3.5 rounded-2xl",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, loading, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          <>
            <span className="spinner" />
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
