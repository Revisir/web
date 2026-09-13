import * as echarts from "echarts";
import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import useDynamicWidth from "../../hooks/useDynamicWidth";
import useCharts from "../../hooks/useCharts";

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

export default function ForgettingCurve({ data }: ForgettingCurveProps) {
  const [chartClass, setChartClass] = useState<echarts.ECharts>();
  const { chartRef, chartParentRef } = useDynamicWidth(chartClass, {
    lg: { height: 320, width: 700, setParentWidth: true },
    md: { height: 300, width: 600, setParentWidth: true },
    sm: { height: 280, width: "auto", setParentWidth: true },
  });

  const option: echarts.EChartsOption = useMemo(() => {
    const curveData = data.curvePoints.map((p) => [p.date, Math.round(p.retention * 100)]);
    const markerData = data.revisionMarkers.map((m) => ({
      coord: [m.date, 100],
      value: m.quality,
      itemStyle: {
        color: qualityColor(m.quality),
      },
    }));

    const todayStr = DateTime.now().toISODate();
    const revisionDateStr = DateTime.fromISO(data.revisionDate).toISODate();

    return {
      title: {
        text: "Memory Retention",
        left: "center",
        top: 10,
        textStyle: { fontSize: 14 },
      },
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          if (Array.isArray(params) && params.length > 0) {
            const p = params[0];
            const date = DateTime.fromISO(p.value[0]).toLocaleString(DateTime.DATE_MED);
            return `${date}<br/>Retention: <strong>${p.value[1]}%</strong>`;
          }
          return "";
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
        },
        axisTick: { alignWithLabel: true },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%" },
        splitLine: { lineStyle: { type: "dashed" } },
      },
      series: [
        {
          name: "Retention",
          type: "line",
          data: curveData.map((d) => d[1]),
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2.5, color: "#5470c6" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(84, 112, 198, 0.3)" },
              { offset: 1, color: "rgba(84, 112, 198, 0.02)" },
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
                      lineStyle: { color: "#91cc75", type: "solid" as const, width: 2 },
                      label: { formatter: "Today", position: "end" as const },
                    },
                  ]
                : []),
              ...(revisionDateStr && revisionDateStr !== todayStr
                ? [
                    {
                      xAxis: revisionDateStr,
                      lineStyle: { color: "#ee6666", type: "dashed" as const, width: 2 },
                      label: { formatter: "Due", position: "end" as const },
                    },
                  ]
                : []),
              {
                yAxis: 90,
                lineStyle: { color: "#fac858", type: "dotted" as const, width: 1 },
                label: { formatter: "90% threshold", position: "insideEndTop" as const },
              },
            ],
          },
          markPoint: {
            symbol: "circle",
            symbolSize: 12,
            data: markerData,
            label: {
              show: true,
              formatter: (p: any) => `Q${p.value}`,
              fontSize: 9,
              position: "top",
            },
          },
        },
      ],
    };
  }, [data]);

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

function qualityColor(quality: number): string {
  if (quality >= 4.5) return "#91cc75";
  if (quality >= 3.5) return "#fac858";
  if (quality >= 2.5) return "#fc8452";
  return "#ee6666";
}
