import { createElement, useContext, type ReactNode } from "react";
import { act, fireEvent, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import useThemeColors from "./useThemeColors";
import { AppContext, AppProvider } from "@/store/AppProvider";
import { TOGGLE_THEME } from "@/store/reducers/themeReducer.mjs";
import { renderWithProviders } from "@/test/renderWithProviders";
import { MindMapView } from "@/Components/topics/TopicDetails";

type FakeMind = { options: Record<string, unknown>; init: Mock; changeTheme: Mock; destroy: Mock };

const { minds } = vi.hoisted(() => ({ minds: [] as FakeMind[] }));

vi.mock("mind-elixir", () => ({
  default: class FakeMindElixir {
    static SIDE = 2;
    options: Record<string, unknown>;
    init = vi.fn();
    changeTheme = vi.fn();
    destroy = vi.fn();
    constructor(options: Record<string, unknown>) {
      this.options = options;
      minds.push(this);
    }
  },
}));

// TopicDetails imports the PDF page selector, whose pdfjs build needs canvas APIs that jsdom lacks.
vi.mock("@/Components/topics/PdfPageSelector", () => ({ default: () => null }));

const LIGHT = {
  "--chart-1": "#494bd6",
  "--chart-2": "#006c49",
  "--chart-3": "#855300",
  "--chart-4": "#b62320",
  "--chart-5": "#464555",
  "--foreground": "#171c24",
  "--muted-foreground": "#464555",
  "--border": "#c7c4d7",
  "--primary": "#494bd6",
  "--surface-container-low": "#f0f3ff",
};
const DARK = {
  "--chart-1": "#c0c1ff",
  "--chart-2": "#4edea3",
  "--chart-3": "#ffb95f",
  "--chart-4": "#ffb4ab",
  "--chart-5": "#c7c4d7",
  "--foreground": "#dfe2ee",
  "--muted-foreground": "#c7c4d7",
  "--border": "#464554",
  "--primary": "#c0c1ff",
  "--surface-container-low": "#181c24",
};

function setTokens(tokens: Record<string, string>) {
  for (const [name, value] of Object.entries(tokens)) document.documentElement.style.setProperty(name, value);
}

function chartTokens(tokens: Record<string, string>) {
  return ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"].map((name) => tokens[name]);
}

function ThemeToggle() {
  const { dispatchTheme } = useContext(AppContext);
  return createElement("button", { type: "button", onClick: () => dispatchTheme({ type: TOGGLE_THEME }) }, "Toggle theme");
}

afterEach(() => {
  document.documentElement.removeAttribute("style");
  minds.length = 0;
});

describe("useThemeColors", () => {
  const wrapper = ({ children }: { children: ReactNode }) => createElement(AppProvider, null, children);

  it("reads the new token values when the theme toggles", () => {
    setTokens(LIGHT);
    const { result, rerender } = renderHook(() => ({ colors: useThemeColors(), app: useContext(AppContext) }), { wrapper });

    expect(result.current.colors).toMatchObject({
      mode: "light",
      chart: chartTokens(LIGHT),
      foreground: LIGHT["--foreground"],
      mutedForeground: LIGHT["--muted-foreground"],
      border: LIGHT["--border"],
      surfaceContainerLow: LIGHT["--surface-container-low"],
    });

    setTokens(DARK);
    // A plain re-render keeps the values; the theme toggle is what makes the hook read again.
    rerender();
    expect(result.current.colors.foreground).toBe(LIGHT["--foreground"]);

    act(() => result.current.app.dispatchTheme({ type: TOGGLE_THEME }));

    expect(document.documentElement).toHaveClass("dark");
    expect(result.current.colors).toMatchObject({
      mode: "dark",
      chart: chartTokens(DARK),
      foreground: DARK["--foreground"],
      mutedForeground: DARK["--muted-foreground"],
      border: DARK["--border"],
      surfaceContainerLow: DARK["--surface-container-low"],
    });
  });

  it("returns the same object between renders while the theme is unchanged", () => {
    setTokens(LIGHT);
    const { result, rerender } = renderHook(() => useThemeColors(), { wrapper });
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});

describe("MindMapView theme", () => {
  const topic = {
    _id: "topic-1",
    topicName: "Optics",
    files: [],
    urls: [],
    mindMap: JSON.stringify({ nodeData: { id: "root", topic: "Optics", children: [] } }),
  };

  it("starts the mind map with a token theme and changes it when the app theme toggles", () => {
    setTokens(LIGHT);
    const { unmount } = renderWithProviders(createElement("div", null, createElement(ThemeToggle), createElement(MindMapView, { topic })));

    expect(minds).toHaveLength(1);
    const [mind] = minds;
    expect(mind.options.theme).toMatchObject({
      type: "light",
      palette: chartTokens(LIGHT),
      cssVar: expect.objectContaining({ "--root-bgcolor": LIGHT["--primary"], "--main-color": LIGHT["--foreground"] }),
    });
    expect(mind.init).toHaveBeenCalledWith(JSON.parse(topic.mindMap));
    expect(mind.changeTheme).not.toHaveBeenCalled();

    setTokens(DARK);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(minds).toHaveLength(1);
    expect(mind.changeTheme).toHaveBeenCalledTimes(1);
    expect(mind.changeTheme).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "dark",
        palette: chartTokens(DARK),
        cssVar: expect.objectContaining({ "--root-bgcolor": DARK["--primary"], "--main-color": DARK["--foreground"] }),
      }),
    );

    unmount();
    expect(mind.destroy).toHaveBeenCalledTimes(1);
  });
});
