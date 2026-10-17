import type { ReactNode } from "react";

type MetricChipProps = {
  label: string;
  value: ReactNode;
};

// One labeled figure, such as an SM-2 value. Render it inside a <dl>.
export default function MetricChip({ label, value }: MetricChipProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-surface-container-lowest px-2 py-1">
      <dt className="text-label-sm uppercase text-muted-foreground">{label}</dt>
      <dd className="m-0 font-mono text-mono-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
