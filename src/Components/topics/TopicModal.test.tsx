import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateTime } from "luxon";
import TopicModal from "./TopicModal";
import { renderWithProviders } from "../../test/renderWithProviders";
import { useTopicCreate, useTopicUpdate } from "../../hooks/useTopicQuery";

vi.mock("../../hooks/useTopicQuery", () => ({
  useTopicCreate: vi.fn(),
  useTopicUpdate: vi.fn(),
}));

vi.mock("../../hooks/useSubjectSuggestions", () => ({
  useSubjectSuggestions: () => [],
}));

type MutateOptions = { onSettled?: () => void };

// Settles at once, as a finished request would, so the modal's close callback runs.
const settle = (_variables: unknown, options?: MutateOptions) => options?.onSettled?.();
const createTopic = vi.fn(settle);
const updateTopic = vi.fn(settle);

describe("TopicModal", () => {
  beforeEach(() => {
    createTopic.mockClear();
    updateTopic.mockClear();
    vi.mocked(useTopicCreate).mockReturnValue({ isPending: false, mutate: createTopic } as unknown as ReturnType<typeof useTopicCreate>);
    vi.mocked(useTopicUpdate).mockReturnValue({ isPending: false, mutate: updateTopic } as unknown as ReturnType<typeof useTopicUpdate>);
  });

  it("creates a topic with its name, subject, date and links, then closes", async () => {
    const user = userEvent.setup();
    const setShowModal = vi.fn();
    renderWithProviders(<TopicModal setShowModal={setShowModal} />);

    const dialog = screen.getByRole("dialog", { name: "New Topic" });
    const studied = DateTime.now().minus({ days: 2 }).toISODate();

    await user.type(within(dialog).getByLabelText("Topic Name"), "Krebs cycle");
    await user.type(within(dialog).getByLabelText("Subject"), "Biochemistry");
    fireEvent.change(within(dialog).getByLabelText("Date Learnt"), { target: { value: studied } });
    await user.type(within(dialog).getByLabelText("Describe it"), "Citric acid cycle");
    await user.type(within(dialog).getByRole("textbox", { name: "Link" }), "https://example.com/notes");
    await user.click(within(dialog).getByRole("button", { name: "Add link" }));
    const links = within(dialog).getAllByRole("textbox", { name: "Link" });
    expect(links).toHaveLength(2);
    await user.type(links[1], "https://example.com/video");

    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    expect(createTopic).toHaveBeenCalledTimes(1);
    expect(createTopic.mock.calls[0][0]).toEqual({
      formData: {
        topicName: "Krebs cycle",
        subjectName: "Biochemistry",
        dateStudied: studied,
        description: "Citric acid cycle",
        urls: ["https://example.com/notes", "https://example.com/video"],
      },
    });
    expect(updateTopic).not.toHaveBeenCalled();
    expect(setShowModal).toHaveBeenCalledWith(false);
  });

  it("sends today's date and no links when they are left alone", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopicModal setShowModal={vi.fn()} />);

    await user.type(screen.getByLabelText("Topic Name"), "Glycolysis");
    await user.type(screen.getByLabelText("Subject"), "Biochemistry");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(createTopic.mock.calls[0][0]).toEqual({
      formData: { topicName: "Glycolysis", subjectName: "Biochemistry", dateStudied: DateTime.now().toISODate(), description: "" },
    });
  });

  it("does not submit without a name and subject", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopicModal setShowModal={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(createTopic).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Topic Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Subject")).toHaveAttribute("aria-invalid", "true");
  });

  it("pre-fills an existing topic and saves the edit through the update call", async () => {
    const user = userEvent.setup();
    const setShowModal = vi.fn();
    const dateStudied = "2026-08-03T00:00:00.000Z";
    const topic = {
      _id: "t1",
      topicName: "Krebs cycle",
      subjectName: "Biochemistry",
      description: "Citric acid cycle",
      dateStudied,
      urls: [{ url: "https://example.com/notes" }],
    };
    renderWithProviders(<TopicModal setShowModal={setShowModal} topic={topic} />);

    const dialog = screen.getByRole("dialog", { name: "Edit Topic" });
    const name = within(dialog).getByLabelText("Topic Name");
    expect(name).toHaveValue("Krebs cycle");
    expect(within(dialog).getByLabelText("Subject")).toHaveValue("Biochemistry");
    expect(within(dialog).getByLabelText("Describe it")).toHaveValue("Citric acid cycle");
    expect(within(dialog).getByLabelText("Date Learnt")).toHaveValue(DateTime.fromISO(dateStudied).toISODate());
    expect(within(dialog).getByRole("textbox", { name: "Link" })).toHaveValue("https://example.com/notes");

    await user.clear(name);
    await user.type(name, "TCA cycle");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(updateTopic).toHaveBeenCalledTimes(1);
    expect(updateTopic.mock.calls[0][0]).toEqual({
      id: "t1",
      formData: {
        topicName: "TCA cycle",
        subjectName: "Biochemistry",
        description: "Citric acid cycle",
        dateStudied: DateTime.fromISO(dateStudied).toISODate(),
        urls: ["https://example.com/notes"],
      },
    });
    expect(createTopic).not.toHaveBeenCalled();
    expect(setShowModal).toHaveBeenCalledWith(false);
  });

  it("closes from Cancel without saving", async () => {
    const user = userEvent.setup();
    const setShowModal = vi.fn();
    renderWithProviders(<TopicModal setShowModal={setShowModal} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(setShowModal).toHaveBeenCalledWith(false);
    expect(createTopic).not.toHaveBeenCalled();
  });
});
