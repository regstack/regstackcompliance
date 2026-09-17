import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-copper-500 text-accent-foreground hover:bg-copper-400 active:bg-copper-600 border border-copper-500",
  secondary:
    "bg-surface-raised text-foreground hover:bg-graphite-700 border border-border-strong",
  ghost:
    "bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-raised border border-transparent",
  danger:
    "bg-transparent text-status-danger hover:bg-status-danger-bg border border-status-danger/40",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ variant = "primary", className = "", ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    {...props}
  />
));
Button.displayName = "Button";
