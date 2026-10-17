import type { ReactNode } from "react";
import { Badge } from "@/Components/ui/badge";

export type StatusTone = "neutral" | "success" | "warning" | "destructive";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-surface-container-high text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
};

type StatusBadgeProps = {
  tone?: StatusTone;
  icon?: ReactNode;
  children: ReactNode;
};

export default function StatusBadge({ tone = "neutral", icon, children }: StatusBadgeProps) {
  return (
    <Badge className={`h-auto rounded-md px-2 py-0.5 ${TONE_CLASSES[tone]}`}>
      {icon}
      <span className="font-mono text-mono-sm font-semibold">{children}</span>
    </Badge>
  );
}
