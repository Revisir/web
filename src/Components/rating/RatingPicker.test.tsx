import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RatingPicker from "./RatingPicker";

const LABELS = ["0 Blackout", "1 Wrong", "2 Hard", "3 Hesitant", "4 Good", "5 Perfect"];

const optionNames = () => screen.getAllByRole("radio").map((option) => option.getAttribute("aria-label"));

describe("RatingPicker", () => {
  it("shows six options from Blackout to Perfect, each with its next interval when intervals are given", () => {
    render(<RatingPicker value={null} onChange={vi.fn()} intervals={[1, 1, 2, 6, 15, 16]} />);

    expect(screen.getByRole("radiogroup", { name: "Rating" })).toBeInTheDocument();
    expect(optionNames()).toEqual(["0 Blackout, in 1 day", "1 Wrong, in 1 day", "2 Hard, in 2 days", "3 Hesitant, in 6 days", "4 Good, in 15 days", "5 Perfect, in 16 days"]);
    expect(within(screen.getByRole("radio", { name: /^4 Good/ })).getByText("in 15 days")).toBeInTheDocument();
  });

  it("shows the six options without intervals when none are given", () => {
    render(<RatingPicker value={null} onChange={vi.fn()} />);

    expect(optionNames()).toEqual(LABELS);
    expect(screen.getByText("Blackout")).toBeInTheDocument();
    expect(screen.getByText("Perfect")).toBeInTheDocument();
    expect(screen.queryByText(/^in \d+ days?$/)).not.toBeInTheDocument();
  });

  it("leaves intervals out when the list does not cover every rating", () => {
    render(<RatingPicker value={null} onChange={vi.fn()} intervals={[1, 6]} />);

    expect(optionNames()).toEqual(LABELS);
  });

  it("passes a chosen 0 through as the number 0", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<RatingPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "0 Blackout" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(0);

    rerender(<RatingPicker value={0} onChange={onChange} />);

    expect(screen.getByRole("radio", { name: "0 Blackout" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "5 Perfect" })).not.toBeChecked();
  });

  it("keeps the chosen rating when it is pressed again", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RatingPicker value={3} onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "3 Hesitant" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "3 Hesitant" })).toBeChecked();
  });

  it("disables every option while disabled", () => {
    render(<RatingPicker value={null} onChange={vi.fn()} disabled />);

    for (const option of screen.getAllByRole("radio")) expect(option).toBeDisabled();
  });
});
