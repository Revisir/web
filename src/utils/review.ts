import { DateTime } from "luxon";
import type { ReviewReason } from "../hooks/useDueQueue";

// Why a quiz cannot start, worded the same on the queue cards and the topic page.
export const REVIEW_REASON_TEXT: Record<ReviewReason, string> = {
  done_today: "Already reviewed today",
  not_due: "Not due yet",
  no_materials: "No materials",
  not_enough_questions: "Not enough questions yet",
  ai_not_configured: "AI is not set up",
  materials_processing: "Materials are still processing",
  preparing_questions: "Questions are being prepared",
  extraction_failed: "Materials could not be read",
  no_questions: "No questions left",
};

export function reviewReasonText(reason: ReviewReason | null, overrides: Partial<Record<ReviewReason, string>> = {}) {
  if (!reason) return "Not available right now";
  return overrides[reason] ?? REVIEW_REASON_TEXT[reason];
}

export function pluralize(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatDate(iso: string, format: Intl.DateTimeFormatOptions = DateTime.DATE_MED) {
  return DateTime.fromISO(iso).toLocaleString(format);
}
