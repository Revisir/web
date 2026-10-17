import { describe, expect, it } from "vitest";
import { formatRating, ratingLabel } from "./ratings";

describe("ratings", () => {
  it("labels each rating from Blackout to Perfect", () => {
    expect([0, 1, 2, 3, 4, 5].map(ratingLabel)).toEqual(["Blackout", "Wrong", "Hard", "Hesitant", "Good", "Perfect"]);
  });

  it("formats whole and half ratings", () => {
    expect(formatRating(0)).toBe("0");
    expect(formatRating(3.5)).toBe("3.5");
    expect(ratingLabel(3.5)).toBe("Good");
  });
});
