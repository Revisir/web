import { createElement, useContext, useState } from "react";
import { fireEvent, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import * as echarts from "echarts";
import useCharts from "./useCharts";
import SunBurstBook from "@/Components/charts/SunBurstBook";
import { AppContext } from "@/store/AppProvider";
import { TOGGLE_THEME } from "@/store/reducers/themeReducer.mjs";
import { renderWithProviders } from "@/test/renderWithProviders";

type FakeChart = { setOption: Mock; resize: Mock; dispose: Mock };

const { fakeCharts } = vi.hoisted(() => ({ fakeCharts: [] as FakeChart[] }));

vi.mock("echarts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("echarts")>();
  return {
    ...actual,
    init: vi.fn(() => {
      const chart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() };
      fakeCharts.push(chart);
      return chart;
    }),
  };
});

const LIGHT = { "--warning": "#855300", "--success": "#006c49", "--background": "#f9f9ff" };
const DARK = { "--warning": "#ffb95f", "--success": "#4edea3", "--background": "#0f131c" };

function setTokens(tokens: Record<string, string>) {
  for (const [name, value] of Object.entries(tokens)) document.documentElement.style.setProperty(name, value);
}

function ThemeToggle() {
  const { dispatchTheme } = useContext(AppContext);
  return createElement("button", { type: "button", onClick: () => dispatchTheme({ type: TOGGLE_THEME }) }, "Toggle theme");
}

function lastOption(chart: FakeChart): echarts.EChartsOption {
  return chart.setOption.mock.lastCall?.[0];
}

beforeEach(() => {
  fakeCharts.length = 0;
  vi.mocked(echarts.init).mockClear();
});

afterEach(() => {
  document.documentElement.removeAttribute("style");
});

describe("useCharts", () => {
  const chartRef = { current: document.createElement("div") };

  function useChartHarness(option: echarts.EChartsOption) {
    const [chart, setChart] = useState<echarts.ECharts>();
    useCharts(chartRef, option, chart, setChart);
    return chart;
  }

  it("re-applies new options to the same chart instance", () => {
    const first: echarts.EChartsOption = { title: { text: "first" } };
    const second: echarts.EChartsOption = { title: { text: "second" } };
    const { rerender } = renderHook(({ option }) => useChartHarness(option), { initialProps: { option: first } });

    expect(echarts.init).toHaveBeenCalledTimes(1);
    const [chart] = fakeCharts;
    expect(chart.setOption).toHaveBeenCalledTimes(1);
    expect(chart.setOption).toHaveBeenLastCalledWith(first);

    rerender({ option: second });

    expect(echarts.init).toHaveBeenCalledTimes(1);
    expect(chart.setOption).toHaveBeenCalledTimes(2);
    expect(chart.setOption).toHaveBeenLastCalledWith(second);

    rerender({ option: second });
    expect(chart.setOption).toHaveBeenCalledTimes(2);
  });

  it("disposes the chart on unmount", () => {
    const { unmount } = renderHook(() => useChartHarness({}));
    const [chart] = fakeCharts;
    expect(chart.dispose).not.toHaveBeenCalled();

    unmount();

    expect(chart.dispose).toHaveBeenCalledTimes(1);
  });
});

describe("SunBurstBook", () => {
  const perSubject = [
    {
      name: "Physics",
      children: [
        { itemStyle: { shadowColor: "#f37324" }, label: { color: "#e12729" }, name: "Due", value: 2 },
        { itemStyle: { shadowColor: "#72b043" }, label: { color: "#007f4e" }, name: "Revised", value: 3 },
      ],
    },
  ];

  function ringsOf(option: echarts.EChartsOption) {
    const [series] = option.series as echarts.SunburstSeriesOption[];
    return series.data?.[0].children;
  }

  it("draws the response's Due and Revised rings with token colors", () => {
    setTokens(LIGHT);
    renderWithProviders(createElement(SunBurstBook, { data: perSubject }));

    const option = lastOption(fakeCharts[0]);
    expect(ringsOf(option)).toEqual([
      { name: "Due", value: 2, itemStyle: { shadowColor: LIGHT["--warning"] }, label: { color: LIGHT["--warning"] } },
      { name: "Revised", value: 3, itemStyle: { shadowColor: LIGHT["--success"] }, label: { color: LIGHT["--success"] } },
    ]);
    const serialized = JSON.stringify(option);
    for (const hardcoded of ["#f37324", "#e12729", "#72b043", "#007f4e"]) expect(serialized).not.toContain(hardcoded);
  });

  it("redraws the same chart with the new tokens when the theme toggles", () => {
    setTokens(LIGHT);
    renderWithProviders(createElement("div", null, createElement(ThemeToggle), createElement(SunBurstBook, { data: perSubject })));
    const [chart] = fakeCharts;
    const callsBefore = chart.setOption.mock.calls.length;

    setTokens(DARK);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(fakeCharts).toHaveLength(1);
    expect(chart.setOption.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(ringsOf(lastOption(chart))?.[0]).toMatchObject({ itemStyle: { shadowColor: DARK["--warning"] }, label: { color: DARK["--warning"] } });
  });
});
