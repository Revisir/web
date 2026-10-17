import * as echarts from "echarts";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import useDynamicWidth from "../../hooks/useDynamicWidth";
import useCharts from "../../hooks/useCharts";
import useThemeColors from "@/hooks/useThemeColors";

// Module-level so useDynamicWidth sees the same object on every render.
const BREAKPOINTS = {
  lg: { height: 300, width: 900, setParentWidth: true },
  md: { height: 300, width: 900, setParentWidth: true },
  sm: { height: 300, width: 900, setParentWidth: true },
};

export default function CalendarHeatMap({ data }) {
  const [chartClass, setChartClass] = useState();
  const { chartRef, chartParentRef } = useDynamicWidth(chartClass, BREAKPOINTS);
  const colors = useThemeColors();

  const option = useMemo(
    () => ({
      title: {
        bottom: 30,
        left: "center",
        text: "Daily Revision Count",
        textStyle: { color: colors.foreground },
      },
      tooltip: {
        backgroundColor: colors.surfaceContainer,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
      },
      visualMap: {
        min: 0,
        max: data.max,
        type: "piecewise",
        orient: "horizontal",
        left: "center",
        bottom: 65,
        textStyle: { color: colors.mutedForeground },
        inRange: { color: [echarts.color.modifyAlpha(colors.primary, 0.25), colors.primary] },
      },
      calendar: {
        bottom: 120,
        left: 30,
        right: 30,
        cellSize: ["auto", 20],
        range: DateTime.now().get("year"),
        itemStyle: {
          borderWidth: 0.5,
          color: colors.surfaceContainerLow,
          borderColor: colors.border,
        },
        splitLine: { lineStyle: { color: colors.mutedForeground } },
        dayLabel: { color: colors.mutedForeground },
        monthLabel: { color: colors.mutedForeground },
        yearLabel: { show: false },
      },
      series: {
        type: "heatmap",
        coordinateSystem: "calendar",
        data: data.dataArr,
      },
    }),
    [data, colors],
  );

  useCharts(chartRef, option, chartClass, setChartClass);

  return (
    <div ref={chartParentRef} className="card mw-100 overflow-auto" style={{ border: 0 }}>
      <div ref={chartRef} />
    </div>
  );
}
