import { ToggleGroup, ToggleGroupItem } from "@/Components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { RATINGS, RATING_LABELS } from "../../utils/ratings";

type RatingPickerProps = {
  // The chosen rating, or null before one is chosen. 0 is a real rating (R31).
  value: number | null;
  onChange: (rating: number) => void;
  // Days until the next review for each rating 0–5, from the topic's `nextIntervals` (R32).
  intervals?: readonly number[] | null;
  disabled?: boolean;
  label?: string;
};

// Stitch rating dock colors: failed recall, shaky recall, solid recall.
const RATING_TONES = ["text-destructive", "text-destructive", "text-warning", "text-warning", "text-success", "text-success"];

function inDays(days: number) {
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

function hasIntervals(intervals: RatingPickerProps["intervals"]): intervals is readonly number[] {
  return Array.isArray(intervals) && intervals.length === RATINGS.length && intervals.every((days) => typeof days === "number" && Number.isFinite(days));
}

/** The 0–5 recall rating, labeled Blackout to Perfect (KTD18), with each rating's next interval when known. */
export default function RatingPicker({ value, onChange, intervals, disabled = false, label = "Rating" }: RatingPickerProps) {
  const showIntervals = hasIntervals(intervals);

  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value === null ? "" : String(value)}
      // Pressing the chosen rating again reports ""; keep it chosen. Number("0") is 0, so a 0 passes through.
      onValueChange={(next) => {
        if (next !== "") onChange(Number(next));
      }}
      disabled={disabled}
      spacing={1}
      className="grid w-full grid-cols-3 sm:grid-cols-6"
    >
      {RATINGS.map((rating) => {
        const interval = showIntervals ? inDays(intervals[rating]) : null;
        return (
          <ToggleGroupItem
            key={rating}
            value={String(rating)}
            aria-label={`${rating} ${RATING_LABELS[rating]}${interval ? `, ${interval}` : ""}`}
            className="h-auto min-w-0 flex-col gap-0.5 bg-surface-container px-1 py-2 text-muted-foreground hover:bg-surface-container-high data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <span className={cn("font-mono text-mono-lg font-semibold group-data-[state=on]/toggle:text-primary-foreground", RATING_TONES[rating])}>{rating}</span>
            <span className="text-label-md">{RATING_LABELS[rating]}</span>
            {interval && <span className="font-mono text-mono-sm whitespace-nowrap">{interval}</span>}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
