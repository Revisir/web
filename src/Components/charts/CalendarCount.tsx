import * as echarts from "echarts";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import useDynamicWidth from "../../hooks/useDynamicWidth";
import useCharts from "../../hooks/useCharts";
import useThemeColors, { type ThemeColors } from "@/hooks/useThemeColors";

/** `[date, topics due that day]` for the month after today. */
type UpcomingRevision = [string, number];

interface CalendarCountProps {
  data: UpcomingRevision[];
}

// Module-level so useDynamicWidth sees the same object on every render.
const BREAKPOINTS = {
  lg: { height: 400, width: 400, cellSize: 40, setParentWidth: true },
  md: { height: 400, width: 400, cellSize: 40, setParentWidth: true },
  sm: { height: 400, width: "auto" as const, cellSize: 35, setParentWidth: true },
};

export default function CalendarCount({ data }: CalendarCountProps) {
  // ISO strings stay equal across renders on the same day, so the memos below hold.
  const todayIso = DateTime.now().toISODate();
  const monthAheadIso = DateTime.now().plus({ months: 1 }).toISODate();
  const [chartClass, setChartClass] = useState<echarts.ECharts>();
  const colors = useThemeColors();
  const dateData = useMemo(() => {
    const end = DateTime.fromISO(monthAheadIso);
    const dataSet: [string, number][] = [];
    for (let date = DateTime.fromISO(todayIso); date <= end; date = date.plus({ days: 1 })) {
      dataSet.push([date.toISODate() ?? "", -1]);
    }
    return dataSet;
  }, [todayIso, monthAheadIso]);

  const { chartRef, chartParentRef, chartDim } = useDynamicWidth(chartClass, BREAKPOINTS);

  const option = useMemo<echarts.EChartsOption>(() => {
    const cellSize = chartDim.cellSize ?? 40;
    return {
      title: {
        bottom: 20,
        text: "Upcoming Revision",
        textStyle: { color: colors.foreground },
      },
      tooltip: {
        backgroundColor: colors.surfaceContainer,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
      },

      calendar: {
        left: "center",

        top: "center",
        orient: "vertical",
        yearLabel: {
          margin: 10,
          position: "bottom",
          color: colors.mutedForeground,
        },
        monthLabel: {
          margin: 20,
          color: colors.mutedForeground,
        },
        dayLabel: {
          firstDay: 1,
          nameMap: "en",
          color: colors.mutedForeground,
        },
        itemStyle: {
          color: colors.surfaceContainerLow,
          borderColor: colors.border,
        },
        splitLine: {
          lineStyle: { color: colors.mutedForeground },
        },
        cellSize,
        range: [todayIso, monthAheadIso],
      },

      series: [
        {
          type: "scatter",
          coordinateSystem: "calendar",

          symbolSize: 0,
          label: {
            show: true,
            formatter: (params) => echarts.time.format((params.value as UpcomingRevision)[0], "{dd}", false),
            offset: [-cellSize / 2 + 10, -cellSize / 2 + 10],
            color: colors.foreground,
          },
          silent: true,
          data: dateData,
        },
        {
          type: "effectScatter",
          coordinateSystem: "calendar",
          calendarIndex: 0,
          symbolSize: (val: UpcomingRevision) => Math.min(val[1] * 5, 20),
          itemStyle: {
            color: (params) => loadColor((params.value as UpcomingRevision)[1], colors),
          },
          data,
        },
      ],
    };
  }, [data, dateData, todayIso, monthAheadIso, chartDim, colors]);

  useCharts(chartRef, option, chartClass, setChartClass);

  return (
    <div ref={chartParentRef} className="card" style={{ border: 0 }}>
      <div ref={chartRef} />
    </div>
  );
}

/** A day's dot runs from success for a light day through warning to destructive for a heavy one. */
function loadColor(count: number, colors: ThemeColors): string {
  if (count <= 2) return colors.success;
  if (count <= 4) return colors.warning;
  return colors.destructive;
}
