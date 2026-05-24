import * as echarts from "echarts";
import { DateTime } from "luxon";
import { useLayoutEffect } from "react";
import { useEffect } from "react";
import { useRef } from "react";
import useDimensions from "../../hooks/useDimensions";
import { useState } from "react";
export default function CalendarHeatMap({ data }) {
  const chartRef = useRef();
  const chartClassRef = useRef();
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
  const dimension = useDimensions();
  const [chartDim, setChartDim] = useState({ height: 300, width: 900 });
  useEffect(() => {
    if (!chartRef.current) return;

    chartClassRef.current = echarts.init(chartRef.current, null, {
      renderer: "canvas",
      useDirtyRect: false,
    });
    chartClassRef.current.setOption(option);

    return () => {
      echarts.dispose(chartClassRef.current);
    };
  }, [chartRef.current]);
  useEffect(() => {
    if (!chartClassRef.current) return;
    const currentViewPortWidth = dimension.width;
    if (currentViewPortWidth >= 992) {
      setChartDim({ height: 300, width: 900 });
    } else {
      setChartDim({ height: 300, width: 500 });
    }
  }, [dimension, chartClassRef]);

  useEffect(() => {
    chartClassRef.current?.resize({ width: chartDim.width, height: chartDim.height });
  }, [chartDim]);

  return (
    <div className="card mw-100 overflow-x-auto">
      <div ref={chartRef} style={{ height: "300px", width: "900px" }} />
    </div>
  );
}
