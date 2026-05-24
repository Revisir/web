import * as echarts from "echarts";
import { DateTime } from "luxon";
import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import useDimensions from "../../hooks/useDimensions";

export default function CalendarCount({ data }) {
  const today = DateTime.now();
  const oneMonthAhead = DateTime.now().plus({ months: 1 });
  const chartRef = useRef<HTMLDivElement>(null);
  const chartClassRef = useRef<echarts.ECharts>(null);
  const dateData = useMemo(() => {
    let tempDate = today;
    const dataSet = [];
    while (tempDate <= oneMonthAhead) {
      dataSet.push([tempDate.toISODate(), -1]);
      tempDate = tempDate.plus({ days: 1 });
    }
    return dataSet;
  }, [today, oneMonthAhead]);
  const dimension = useDimensions();
  const [chartDim, setChartDim] = useState({ height: 300, width: 400 });
  const [cellSize, setCellsize] = useState(40);
  const option: echarts.EChartsOption = useMemo(() => {
    return {
      title: {
        // margin: 10,
        bottom: 20,
        text: "Upcoming Revision",
      },
      tooltip: {},

      calendar: {
        left: "center",

        top: "center",
        orient: "vertical",
        yearLabel: {
          margin: 10,
          position: "bottom",
        },
        monthLabel: {
          margin: 20,
        },
        dayLabel: {
          firstDay: 1,
          nameMap: "en",
        },
        cellSize: cellSize,
        range: [today.toISODate(), oneMonthAhead.toISODate()],
      },

      series: [
        {
          type: "scatter",
          coordinateSystem: "calendar",

          symbolSize: 0,
          label: {
            show: true,
            formatter: function (params: { value: [string, number] }) {
              return echarts.time.format(params.value[0], "{dd}", false);
            },
            offset: [-cellSize / 2 + 10, -cellSize / 2 + 10],
            color: "#000",
          },
          silent: true,
          data: dateData,
        },
        {
          type: "effectScatter",
          coordinateSystem: "calendar",
          calendarIndex: 0,
          symbolSize: function (val) {
            return Math.min(val[1] * 5, 20);
          },
          itemStyle: {
            color: function (params: { value: [string, number] }) {
              const value = params.value[1];

              switch (value) {
                case 0:
                  return "#ffffff";
                case 1:
                  return "#6aeb63";
                case 2:
                  return "#34fe26";
                case 3:
                  return "#ffee00";
                case 4:
                  return "#ff9500";
                case 5:
                  return "#ed6363";
                case 6:
                  return "#ff0000";
                default:
                  return "#b60f0f";
              }
            },
          },
          data,
        },
      ],
    } as echarts.EChartsOption;
  }, [data, dateData, oneMonthAhead, today, cellSize]);
  useEffect(() => {
    if (!chartRef.current) return;

    chartClassRef.current = echarts.init(chartRef.current, null, {
      renderer: "canvas",
      useDirtyRect: false,
    });
    chartClassRef.current.setOption(option);

    return () => {
      if (chartClassRef.current) echarts.dispose(chartClassRef.current);
    };
  }, [chartRef, option]);

  useEffect(() => {
    if (!chartClassRef.current) return;
    const currentViewPortWidth = dimension.width;
    if (currentViewPortWidth >= 992) {
      setChartDim({ height: 350, width: 400 });
      setCellsize(40);
    } else {
      setChartDim({ height: 350, width: 400 });
      setCellsize(35);
    }
  }, [dimension, chartClassRef]);

  useEffect(() => {
    chartClassRef.current?.resize({ width: chartDim.width, height: chartDim.height });
  }, [chartDim]);

  return (
    <div className="card mw-100 overflow-x-auto" style={{ height: `${chartDim.height}px`, width: `${chartDim.width}px` }}>
      <div ref={chartRef} style={{ height: `${chartDim.height}px`, width: `${chartDim.width}px` }} />
    </div>
  );
}
