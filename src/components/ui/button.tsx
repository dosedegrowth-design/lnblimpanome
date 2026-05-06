"use client";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5",
        forest:
          "bg-forest-800 text-white hover:bg-forest-700 active:bg-forest-900 shadow-md shadow-forest-800/30 hover:-translate-y-0.5",
        outline:
          "border border-gray-300 bg-white text-gray-900 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50/50 active:bg-brand-50",
        ghost:
          "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
        danger:
          "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
        link:
          "text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9  px-3.5 text-sm",
        md: "h-10 px-4   text-sm",
        lg: "h-12 px-6   text-base",
        xl: "h-14 px-8   text-base",
        icon: "h-10 w-10",
      },
      width: { auto: "", full: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md", width: "auto" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, width, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, width }), className)}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : null}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export { buttonVariants };
