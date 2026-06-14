import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-card shadow-sm border border-border rounded-xl overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-muted/40 border-border border-b">{children}</thead>;
}

export function TH({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 font-semibold text-muted-foreground text-xs text-left uppercase tracking-wider", className)}>
      {children}
    </th>
  );
}

export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("hover:bg-muted/40 border-border last:border-0 border-b", className)}>{children}</tr>;
}

export function TD({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-foreground", className)}>{children}</td>;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["bg-blue-500","bg-purple-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-indigo-500","bg-teal-500"];
  const c = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={cn("flex justify-center items-center rounded-full w-9 h-9 font-semibold text-white text-xs", c, className)}>
      {initials}
    </div>
  );
}

export function ActionButton({ children, variant = "ghost", onClick, title }: { children: ReactNode; variant?: "ghost"|"danger"; onClick?: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex justify-center items-center rounded-md w-8 h-8 text-muted-foreground transition-colors",
        variant === "danger" ? "hover:bg-red-50 hover:text-danger" : "hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
