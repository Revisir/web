import * as echarts from "echarts";
import { DateTime } from "luxon";
import { useState } from "react";
import useDynamicWidth from "../../hooks/useDynamicWidth";
import useCharts from "../../hooks/useCharts";

export default function CalendarHeatMap({ data }) {
  const [chartClass, setChartClass] = useState();
  const { chartRef, chartParentRef, chartDim } = useDynamicWidth(chartClass, {
    lg: { height: 300, width: 900, setParentWidth: true },
    md: { height: 300, width: 900, setParentWidth: true },
    sm: { height: 300, width: 900, setParentWidth: true },
  });

  const option = {
    title: {
      bottom: 30,
      left: "center",
      text: "Daily Revision Count",
    },
    tooltip: {},
    visualMap: {
      min: 0,
      max: data.max,
      type: "piecewise",
      orient: "horizontal",
      left: "center",
      bottom: 65,
    },
    calendar: {
      bottom: 120,
      left: 30,
      right: 30,
      cellSize: ["auto", 20],
      range: DateTime.now().get("year"),
      itemStyle: {
        borderWidth: 0.5,
      },
      yearLabel: { show: false },
    },
    series: {
      type: "heatmap",
      coordinateSystem: "calendar",
      data: data.dataArr,
    },
  };

  useCharts(chartRef, option, chartClass, setChartClass);

  return (
    <div ref={chartParentRef} className="card mw-100 overflow-auto" style={{ border: 0 }}>
      <div ref={chartRef} />
    </div>
  );
}
