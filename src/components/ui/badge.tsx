import { cn } from "@/lib/utils";

const variants = {
  default:  "bg-gray-100 text-gray-700",
  brand:    "bg-brand-100 text-brand-800",
  success:  "bg-green-100 text-green-800",
  warning:  "bg-amber-100 text-amber-800",
  danger:   "bg-red-100 text-red-800",
  outline:  "border border-gray-300 text-gray-700",
} as const;

export function Badge({
  variant = "default",
  className,
  ...p
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...p}
    />
  );
}
