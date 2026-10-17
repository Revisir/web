import { ToggleGroup, ToggleGroupItem } from "@/Components/ui/toggle-group";

export type QueueFilterOption = {
  value: string;
  label: string;
  count: number;
};

type QueueFiltersProps = {
  options: QueueFilterOption[];
  value: string;
  onChange: (value: string) => void;
};

const ITEM_CLASS =
  "h-auto max-w-full gap-2 bg-surface-container px-3 py-1.5 text-muted-foreground hover:bg-surface-container-high hover:text-foreground data-[state=on]:bg-surface-container-high data-[state=on]:text-primary";

export default function QueueFilters({ options, value, onChange }: QueueFiltersProps) {
  return (
    <ToggleGroup
      type="single"
      aria-label="Filter topics"
      value={value}
      // A single toggle group reports "" when the active chip is pressed again; keep a filter selected.
      onValueChange={(next) => next && onChange(next)}
      className="w-full flex-wrap"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className={ITEM_CLASS}>
          <span className="min-w-0 truncate text-label-md">{option.label}</span>{" "}
          <span className="rounded bg-surface-container-highest px-1.5 font-mono text-mono-sm font-semibold text-foreground">{option.count}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
