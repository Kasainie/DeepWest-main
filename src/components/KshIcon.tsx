import { cn } from "@/lib/utils";

interface KshIconProps {
  className?: string;
}

/**
 * Custom KSh currency icon — a bold "KSh" text rendered as an inline
 * element that matches Lucide icon sizing conventions.
 */
export function KshIcon({ className }: KshIconProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-bold leading-none select-none",
        className
      )}
      style={{ fontSize: "0.65em", letterSpacing: "-0.02em" }}
      aria-label="Kenya Shillings"
    >
      KSh
    </span>
  );
}
