import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Trash2 } from "lucide-react";
import IconButton from "./IconButton";
import { renderWithProviders } from "../../test/renderWithProviders";

describe("IconButton", () => {
  it("uses its label as the accessible name and calls onClick", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <IconButton label="Delete" onClick={onClick}>
        <Trash2 />
      </IconButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows its label as a tooltip on focus", async () => {
    renderWithProviders(
      <IconButton label="Reset Progress">
        <Trash2 />
      </IconButton>,
    );
    await userEvent.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Reset Progress");
  });
});
