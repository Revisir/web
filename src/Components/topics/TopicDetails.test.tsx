import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { DateTime } from "luxon";
import TopicDetails from "./TopicDetails";
import { renderWithProviders } from "../../test/renderWithProviders";
import { deleteTopic, getTopic, getTopicForgettingCurve, getTopicHistory, resetTopic } from "../../service/topic_service.mjs";
import type { TopicDetail } from "../../hooks/useTopicQuery";

vi.mock("../../service/topic_service.mjs", () => ({
  getTopic: vi.fn(),
  getTopicHistory: vi.fn(),
  getTopicForgettingCurve: vi.fn(),
  updateTopic: vi.fn(),
  reviseTopic: vi.fn(),
  deleteTopic: vi.fn(),
  addTopic: vi.fn(),
  getFileUploadUrls: vi.fn(),
  deleteTopicFile: vi.fn(),
  resetTopic: vi.fn(),
  generateMindMap: vi.fn(),
  regenerateQuestions: vi.fn(),
}));
// Heavy children of the topic page that jsdom cannot run (mind-elixir, pdfjs, echarts) or that these tests do not use.
vi.mock("mind-elixir", () => ({
  default: class FakeMindElixir {
    static SIDE = 2;
    init() {}
    changeTheme() {}
    destroy() {}
  },
}));
vi.mock("./PdfPageSelector", () => ({ default: () => null }));
vi.mock("../charts/ForgettingCurve", () => ({ default: () => null }));
vi.mock("./TopicModal", () => ({ default: () => null }));

const getTopicMock = vi.mocked(getTopic);
const deleteTopicMock = vi.mocked(deleteTopic);
const resetTopicMock = vi.mocked(resetTopic);

const NOW = DateTime.local();

// Not due, so the review area stays out of the way.
function makeTopic(overrides: Partial<TopicDetail> = {}): TopicDetail {
  return {
    _id: "t1",
    topicName: "Krebs cycle",
    subjectName: "Biochemistry",
    description: "Citric acid cycle",
    dateStudied: NOW.minus({ days: 10 }).toISO()!,
    revisionDate: NOW.plus({ days: 6 }).toISO()!,
    lastRevised: NOW.minus({ days: 1 }).toISO()!,
    eFactor: 2.5,
    interval: 6,
    repetitionNumber: 2,
    review: {
      doneToday: false,
      normalQuiz: { available: false, reason: "not_due", questionCount: 0 },
      aiQuiz: { available: false, reason: "not_due" },
    },
    files: [],
    urls: [],
    mindMap: null,
    ...overrides,
  };
}

function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/topic/:id" element={<TopicDetails />} />
      <Route path="/" element={<LocationProbe />} />
    </Routes>,
    { route: "/topic/t1" },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTopicHistory).mockResolvedValue({ history: [] });
  vi.mocked(getTopicForgettingCurve).mockResolvedValue({});
});

describe("TopicDetails", () => {
  // R40.
  it("shows each file's and URL's processing status, with the reason a failed one gave", async () => {
    const user = userEvent.setup();
    getTopicMock.mockResolvedValue(
      makeTopic({
        files: [
          { _id: "f1", fileName: "notes.pdf", fileType: "pdf", fileUrl: "https://files.example/notes.pdf", processingStatus: "completed" },
          { _id: "f2", fileName: "scan.png", fileType: "png", fileUrl: "https://files.example/scan.png", processingStatus: "failed", errorReason: "No text found" },
          { _id: "f3", fileName: "draft.txt", fileType: "txt", fileUrl: "https://files.example/draft.txt", processingStatus: "pending" },
        ],
        urls: [
          { _id: "u1", url: "https://example.com/krebs", processingStatus: "processing" },
          { _id: "u2", url: "https://example.com/broken", processingStatus: "failed", errorReason: "Extraction returned no content" },
        ],
      }),
    );
    renderPage();

    // The sections start collapsed.
    const materials = await screen.findByRole("button", { name: "Materials" });
    expect(materials).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("notes.pdf")).not.toBeInTheDocument();

    await user.click(materials);

    const fileCard = (name: string) => screen.getByText(name).parentElement!;
    expect(within(fileCard("notes.pdf")).getByText("Completed")).toBeInTheDocument();
    expect(within(fileCard("scan.png")).getByText("Failed")).toBeInTheDocument();
    expect(within(fileCard("draft.txt")).getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("scan.png: No text found")).toBeInTheDocument();

    const urlRow = (url: string) => screen.getByDisplayValue(url).parentElement!;
    expect(within(urlRow("https://example.com/krebs")).getByText("Processing")).toBeInTheDocument();
    expect(within(urlRow("https://example.com/broken")).getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Extraction returned no content")).toBeInTheDocument();
  });

  it("reveals a file's Open and Delete actions when its card takes keyboard focus", async () => {
    const user = userEvent.setup();
    getTopicMock.mockResolvedValue(
      makeTopic({
        files: [{ _id: "f1", fileName: "notes.pdf", fileType: "pdf", fileUrl: "https://files.example/notes.pdf", processingStatus: "completed" }],
      }),
    );
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Materials" }));

    const card = screen.getByRole("group", { name: "notes.pdf" });
    expect(within(card).queryByRole("button", { name: "Delete file" })).not.toBeInTheDocument();

    card.focus();
    expect(await within(card).findByRole("button", { name: "Delete file" })).toBeInTheDocument();
    await user.tab();
    expect(within(card).getByRole("button", { name: "Open in new tab" })).toHaveFocus();
  });

  it("opens a file in a new tab without handing the page a window.opener", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    getTopicMock.mockResolvedValue(
      makeTopic({
        files: [{ _id: "f1", fileName: "notes.pdf", fileType: "pdf", fileUrl: "https://files.example/notes.pdf", processingStatus: "completed" }],
      }),
    );
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Materials" }));

    const card = screen.getByRole("group", { name: "notes.pdf" });
    card.focus();
    await user.click(await within(card).findByRole("button", { name: "Open in new tab" }));

    expect(openSpy).toHaveBeenCalledWith("https://files.example/notes.pdf", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });

  it("asks before deleting the topic, then deletes it once and goes to Today's List", async () => {
    const user = userEvent.setup();
    getTopicMock.mockResolvedValue(makeTopic());
    deleteTopicMock.mockResolvedValue({ success: true });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Confirm Delete" });
    expect(deleteTopicMock).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    expect(await screen.findByTestId("location")).toHaveTextContent("/");
    await waitFor(() => expect(deleteTopicMock).toHaveBeenCalledTimes(1));
    expect(deleteTopicMock).toHaveBeenCalledWith("t1");
  });

  it("asks before resetting progress, then resets it once", async () => {
    const user = userEvent.setup();
    getTopicMock.mockResolvedValue(makeTopic());
    resetTopicMock.mockResolvedValue({ success: true });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reset Progress" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Confirm Reset" });
    expect(resetTopicMock).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole("button", { name: "Reset" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(resetTopicMock).toHaveBeenCalledTimes(1);
    expect(resetTopicMock).toHaveBeenCalledWith("t1");
  });
});
