import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation, useParams } from "react-router-dom";
import Header from "./Header";
import App from "../../App";
import { renderWithProviders } from "../../test/renderWithProviders";
import { userName } from "../../constants.mjs";
import { getTodaysList } from "../../service/topic_service.mjs";
import { signOutRedirect } from "../../utils.mjs";
import type { DueTopic, ReviewAvailability } from "../../hooks/useDueQueue";

vi.mock("../../service/topic_service.mjs", () => ({ getTodaysList: vi.fn(), getAllList: vi.fn() }));
vi.mock("../../utils.mjs", () => ({ signOutRedirect: vi.fn() }));
vi.mock("../topics/TopicModal", () => ({
  default: () => <div role="dialog" aria-label="Add topic" />,
}));
vi.mock("../topics/TopicList", () => ({
  default: ({ listKey }: { listKey: string }) => <p>topic list: {listKey}</p>,
}));
vi.mock("../topics/TopicDetails", () => ({
  default: function TopicDetailsMock() {
    const { id } = useParams();
    return <p>topic details: {id}</p>;
  },
}));
vi.mock("../Stats", () => ({ default: () => <p>stats charts</p> }));
vi.mock("../queue/DueQueue", () => ({ default: () => <p>due queue</p> }));
vi.mock("../quiz/NormalQuiz", () => ({
  default: function NormalQuizMock() {
    const { id } = useParams();
    return <p>normal quiz: {id}</p>;
  },
}));
vi.mock("../Login", () => ({ default: () => <p>login screen</p> }));

const getTodaysListMock = vi.mocked(getTodaysList);

function review(doneToday: boolean): ReviewAvailability {
  return {
    doneToday,
    normalQuiz: { available: !doneToday, reason: doneToday ? "done_today" : null, questionCount: 5 },
    aiQuiz: { available: !doneToday, reason: doneToday ? "done_today" : null },
  };
}

function dueTopic(id: string, overrides: Partial<DueTopic> = {}): DueTopic {
  return {
    _id: id,
    topicName: `Topic ${id}`,
    subjectName: "Cardiology",
    revisionDate: "2026-10-17T00:00:00.000Z",
    lastRevised: null,
    eFactor: 2.5,
    interval: 1,
    repetitionNumber: 1,
    lastQuality: 4,
    estimatedRecall: 0.82,
    nextIntervals: [1, 1, 1, 1, 6, 6],
    questionBank: { state: "ready", usableCount: 9, rebuilding: false },
    review: review(false),
    ...overrides,
  };
}

function logIn() {
  sessionStorage.setItem(userName, "Ada");
}

function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

beforeEach(() => {
  vi.clearAllMocks();
  getTodaysListMock.mockResolvedValue({ topics: [] });
});

describe("Header", () => {
  it("links to Today's List, Topics and Stats and highlights the current route", () => {
    logIn();
    renderWithProviders(<Header />, { route: "/topics" });

    const nav = screen.getByRole("navigation", { name: "Main" });
    const today = within(nav).getByRole("link", { name: /^Today's List/ });
    const topics = within(nav).getByRole("link", { name: "Topics" });
    const stats = within(nav).getByRole("link", { name: "Stats" });

    expect(today).toHaveAttribute("href", "/");
    expect(topics).toHaveAttribute("href", "/topics");
    expect(stats).toHaveAttribute("href", "/stats");
    expect(topics).toHaveAttribute("aria-current", "page");
    expect(today).not.toHaveAttribute("aria-current");
    expect(stats).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Reviser" })).toHaveAttribute("href", "/");
  });

  it("shows how many due topics are left today on the Today's List link", async () => {
    logIn();
    getTodaysListMock.mockResolvedValue({
      topics: [dueTopic("open"), dueTopic("done", { review: review(true) }), dueTopic("legacy", { review: undefined })],
    });
    renderWithProviders(<Header />);

    const nav = screen.getByRole("navigation", { name: "Main" });
    const today = await within(nav).findByRole("link", { name: "Today's List 2 due" });
    expect(today).toHaveAttribute("aria-current", "page");
  });

  it("collapses the navigation and New Topic into a menu for phone widths", async () => {
    logIn();
    getTodaysListMock.mockResolvedValue({ topics: [dueTopic("open")] });
    const user = userEvent.setup();
    renderWithProviders(<Header />, { route: "/stats" });
    await within(screen.getByRole("navigation", { name: "Main" })).findByText("1 due");

    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /^Today's List 1 due/ })).toHaveAttribute("href", "/");
    expect(within(menu).getByRole("menuitem", { name: "Topics" })).toHaveAttribute("href", "/topics");
    expect(within(menu).getByRole("menuitem", { name: "Stats" })).toHaveAttribute("aria-current", "page");

    await user.click(within(menu).getByRole("menuitem", { name: "New Topic" }));
    expect(screen.getByRole("dialog", { name: "Add topic" })).toBeInTheDocument();
  });

  it("opens the topic form from New Topic", async () => {
    logIn();
    const user = userEvent.setup();
    renderWithProviders(<Header />);

    expect(screen.queryByRole("dialog", { name: "Add topic" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New Topic" }));
    expect(screen.getByRole("dialog", { name: "Add topic" })).toBeInTheDocument();
  });

  it("toggles the theme", async () => {
    logIn();
    const user = userEvent.setup();
    renderWithProviders(<Header />);

    await user.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(document.documentElement).toHaveClass("dark");
    await user.click(screen.getByRole("button", { name: "Switch to light mode" }));
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("signs out", async () => {
    logIn();
    const user = userEvent.setup();
    renderWithProviders(<Header />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOutRedirect).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(userName)).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });

  it("shows only the logo and theme toggle to a logged-out visitor", () => {
    renderWithProviders(<Header />);

    expect(screen.getByRole("link", { name: "Reviser" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(getTodaysListMock).not.toHaveBeenCalled();
  });
});

describe("App routes", () => {
  it.each([
    ["/", "Today's List", "due queue"],
    ["/topics", "Topics", "topic list: allTopics"],
    ["/stats", "Stats", "stats charts"],
  ])("renders the %s page", async (route, heading, content) => {
    logIn();
    renderWithProviders(<App />, { route });

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByText(content)).toBeInTheDocument();
    await waitFor(() => expect(getTodaysListMock).toHaveBeenCalled());
  });

  it("renders the topic page at /topic/:id", () => {
    logIn();
    renderWithProviders(<App />, { route: "/topic/t42" });
    expect(screen.getByText("topic details: t42")).toBeInTheDocument();
  });

  it("renders the normal quiz at /topic/:id/quiz", () => {
    logIn();
    renderWithProviders(<App />, { route: "/topic/t42/quiz" });
    expect(screen.getByText("normal quiz: t42")).toBeInTheDocument();
    expect(screen.queryByText(/topic details/)).not.toBeInTheDocument();
  });

  it("shows the login screen at / to a logged-out visitor", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("login screen")).toBeInTheDocument();
  });

  it.each(["/topic/t42", "/topics", "/stats", "/topic/t42/quiz"])("redirects a logged-out visitor from %s to the login screen", (route) => {
    renderWithProviders(
      <>
        <App />
        <LocationProbe />
      </>,
      { route },
    );

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
    expect(screen.getByText("login screen")).toBeInTheDocument();
    expect(screen.queryByText(/topic details/)).not.toBeInTheDocument();
  });
});
