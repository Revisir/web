import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { DateTime } from "luxon";
import TopicListItem from "./TopicListItem";
import { renderWithProviders } from "../../test/renderWithProviders";
import { useMinTopicDetails, useTopicDelete } from "../../hooks/useTopicQuery";

vi.mock("../../hooks/useTopicQuery", () => ({
  useMinTopicDetails: vi.fn(),
  useTopicDelete: vi.fn(),
}));

const deleteTopic = vi.fn();

function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function renderItem(topic: Record<string, unknown>) {
  vi.mocked(useMinTopicDetails).mockReturnValue({ data: topic } as unknown as ReturnType<typeof useMinTopicDetails>);
  renderWithProviders(
    <>
      <TopicListItem id={String(topic._id)} />
      <LocationProbe />
    </>,
    { route: "/topics" },
  );
}

describe("TopicListItem", () => {
  beforeEach(() => {
    deleteTopic.mockReset();
    vi.mocked(useTopicDelete).mockReturnValue({ isPending: false, mutate: deleteTopic } as unknown as ReturnType<typeof useTopicDelete>);
  });

  it("shows a due topic without a Revise button and links it to its topic page", async () => {
    const user = userEvent.setup();
    renderItem({
      _id: "t1",
      topicName: "Krebs cycle",
      subjectName: "Biochemistry",
      revisionDate: DateTime.now().minus({ days: 1 }).toISO(),
      lastRevised: DateTime.now().minus({ days: 7 }).toISO(),
    });

    expect(screen.queryByRole("button", { name: /revise/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Krebs cycle/ });
    expect(link).toHaveAttribute("href", "/topic/t1");
    expect(link).toHaveTextContent("Biochemistry");

    await user.click(link);
    expect(screen.getByTestId("location")).toHaveTextContent("/topic/t1");
  });

  it("deletes the topic only after the confirmation", async () => {
    const user = userEvent.setup();
    renderItem({
      _id: "t2",
      topicName: "Glycolysis",
      subjectName: "Biochemistry",
      revisionDate: DateTime.now().plus({ days: 3 }).toISO(),
      lastRevised: DateTime.now().minus({ days: 2 }).toISO(),
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("alertdialog", { name: "Confirm Delete" });
    expect(dialog).toHaveTextContent('Are you sure you want to delete "Glycolysis"?');
    expect(deleteTopic).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(deleteTopic).toHaveBeenCalledWith({ id: "t2" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
