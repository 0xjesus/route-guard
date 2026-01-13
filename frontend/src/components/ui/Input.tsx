"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const inputVariants = cva(
  `w-full transition-all duration-200
   text-mantle-text-primary placeholder:text-mantle-text-tertiary
   focus:outline-none focus:ring-1
   disabled:opacity-50 disabled:cursor-not-allowed`,
  {
    variants: {
      variant: {
        default: `
          bg-mantle-bg-secondary border border-white/10
          focus:border-mantle-accent focus:ring-mantle-accent
        `,
        ghost: `
          bg-transparent border-b border-white/10
          rounded-none px-0
          focus:border-mantle-accent focus:ring-0
        `,
        filled: `
          bg-mantle-bg-tertiary border border-transparent
          focus:border-mantle-accent focus:ring-mantle-accent
        `,
      },
      inputSize: {
        sm: "px-3 py-2 text-body-sm rounded-lg",
        md: "px-4 py-3 text-body-md rounded-xl",
        lg: "px-5 py-4 text-body-lg rounded-2xl",
      },
      error: {
        true: "border-mantle-error focus:border-mantle-error focus:ring-mantle-error",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    Omit<VariantProps<typeof inputVariants>, "error"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, error, label, hint, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-label-lg font-medium text-mantle-text-secondary mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mantle-text-tertiary">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              inputVariants({ variant, inputSize, error: !!error }),
              leftIcon && "pl-12",
              rightIcon && "pr-12",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-mantle-text-tertiary">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-label-md text-mantle-error">{error}</p>}
        {hint && !error && <p className="mt-2 text-label-md text-mantle-text-tertiary">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input, inputVariants };
