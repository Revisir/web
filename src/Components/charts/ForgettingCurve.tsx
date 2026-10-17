import * as echarts from "echarts";
import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import useDynamicWidth from "../../hooks/useDynamicWidth";
import useCharts from "../../hooks/useCharts";
import useThemeColors, { type ThemeColors } from "@/hooks/useThemeColors";

interface CurvePoint {
  date: string;
  retention: number;
}

interface RevisionMarker {
  date: string;
  quality: number;
  eFactor: number;
  interval: number;
}

interface ForgettingCurveProps {
  data: {
    topicName: string;
    eFactor: number;
    interval: number;
    repetitionNumber: number;
    revisionDate: string;
    lastRevised: string | null;
    curvePoints: CurvePoint[];
    revisionMarkers: RevisionMarker[];
  };
}

// Module-level so useDynamicWidth sees the same object on every render.
const BREAKPOINTS = {
  lg: { height: 320, width: 700, setParentWidth: true },
  md: { height: 300, width: 600, setParentWidth: true },
  sm: { height: 280, width: "auto" as const, setParentWidth: true },
};

export default function ForgettingCurve({ data }: ForgettingCurveProps) {
  const [chartClass, setChartClass] = useState<echarts.ECharts>();
  const { chartRef, chartParentRef } = useDynamicWidth(chartClass, BREAKPOINTS);
  const colors = useThemeColors();

  const option = useMemo<echarts.EChartsOption>(() => {
    const curveData = data.curvePoints.map((p) => [p.date, Math.round(p.retention * 100)] as const);
    const markerData = data.revisionMarkers.map((m) => ({
      name: m.date,
      coord: [m.date, 100],
      value: m.quality,
      itemStyle: {
        color: qualityColor(m.quality, colors),
      },
    }));

    const todayStr = DateTime.now().toISODate();
    const revisionDateStr = DateTime.fromISO(data.revisionDate).toISODate();

    return {
      title: {
        text: "Memory Retention",
        left: "center",
        top: 10,
        textStyle: { fontSize: 14, color: colors.foreground },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: colors.surfaceContainer,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p) return "";
          const date = DateTime.fromISO(String(p.name)).toLocaleString(DateTime.DATE_MED);
          return `${date}<br/>Retention: <strong>${p.value}%</strong>`;
        },
      },
      grid: {
        left: 50,
        right: 30,
        top: 60,
        bottom: 50,
      },
      xAxis: {
        type: "category",
        data: curveData.map((d) => d[0]),
        axisLabel: {
          formatter: (val: string) => DateTime.fromISO(val).toLocaleString({ month: "short", day: "numeric" }),
          rotate: 30,
          color: colors.mutedForeground,
        },
        axisLine: { lineStyle: { color: colors.border } },
        axisTick: { alignWithLabel: true, lineStyle: { color: colors.border } },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%", color: colors.mutedForeground },
        splitLine: { lineStyle: { type: "dashed", color: colors.border } },
      },
      series: [
        {
          name: "Retention",
          type: "line",
          data: curveData.map((d) => d[1]),
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2.5, color: colors.primary },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: echarts.color.modifyAlpha(colors.primary, 0.3) },
              { offset: 1, color: echarts.color.modifyAlpha(colors.primary, 0.02) },
            ]),
          },
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              ...(todayStr
                ? [
                    {
                      xAxis: todayStr,
                      lineStyle: { color: colors.success, type: "solid" as const, width: 2 },
                      label: { formatter: "Today", position: "end" as const, color: colors.success },
                    },
                  ]
                : []),
              ...(revisionDateStr && revisionDateStr !== todayStr
                ? [
                    {
                      xAxis: revisionDateStr,
                      lineStyle: { color: colors.warning, type: "dashed" as const, width: 2 },
                      label: { formatter: "Due", position: "end" as const, color: colors.warning },
                    },
                  ]
                : []),
              {
                yAxis: 90,
                lineStyle: { color: colors.mutedForeground, type: "dotted" as const, width: 1 },
                label: { formatter: "90% threshold", position: "insideEndTop" as const, color: colors.mutedForeground },
              },
            ],
          },
          markPoint: {
            symbol: "circle",
            symbolSize: 12,
            data: markerData,
            label: {
              show: true,
              formatter: (p) => `Q${p.value}`,
              fontSize: 9,
              position: "top",
              color: colors.foreground,
            },
          },
        },
      ],
    };
  }, [data, colors]);

  useCharts(chartRef, option, chartClass, setChartClass);

  return (
    <div ref={chartParentRef} className="card mw-100 overflow-auto" style={{ border: 0 }}>
      <div ref={chartRef} />
      <div className="px-3 pb-2">
        <small className="text-muted">
          Stability factor: {data.eFactor.toFixed(2)} · Current interval: {data.interval} day{data.interval !== 1 ? "s" : ""} · Repetition #{data.repetitionNumber}
        </small>
      </div>
    </div>
  );
}

/** Passing ratings (4 and 5) read as success, a hesitant 3 as warning, and failing ratings as destructive. */
function qualityColor(quality: number, colors: ThemeColors): string {
  if (quality >= 3.5) return colors.success;
  if (quality >= 2.5) return colors.warning;
  return colors.destructive;
}
