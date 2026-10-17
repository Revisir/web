// Ratings run 0–5 everywhere (R31), labeled as on the Stitch quiz screen (KTD18).
export const RATINGS = [0, 1, 2, 3, 4, 5] as const;

export const RATING_LABELS = ["Blackout", "Wrong", "Hard", "Hesitant", "Good", "Perfect"] as const;

// AI-chat reviews average two ratings, so stored ratings can hold halves.
export function formatRating(rating: number): string {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

export function ratingLabel(rating: number): string {
  const index = Math.min(5, Math.max(0, Math.round(rating)));
  return RATING_LABELS[index];
}

// Next intervals are usable only when every rating 0–5 has a finite day count.
export function hasIntervals(intervals: readonly number[] | null | undefined): intervals is readonly number[] {
  return Array.isArray(intervals) && intervals.length === RATINGS.length && intervals.every((days) => typeof days === "number" && Number.isFinite(days));
}
