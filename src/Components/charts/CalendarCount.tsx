import * as echarts from "echarts";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import useDynamicWidth from "../../hooks/useDynamicWidth";
import useCharts from "../../hooks/useCharts";

export default function CalendarCount({ data }) {
  const today = DateTime.now();
  const oneMonthAhead = DateTime.now().plus({ months: 1 });
  const [chartClass, setChartClass] = useState<echarts.ECharts>();
  const dateData = useMemo(() => {
    let tempDate = today;
    const dataSet = [];
    while (tempDate <= oneMonthAhead) {
      dataSet.push([tempDate.toISODate(), -1]);
      tempDate = tempDate.plus({ days: 1 });
    }
    return dataSet;
  }, [today, oneMonthAhead]);

  const { chartRef, chartParentRef, chartDim } = useDynamicWidth(chartClass, {
    lg: { height: 400, width: 400, cellSize: 40, setParentWidth: true },
    md: { height: 400, width: 400, cellSize: 40, setParentWidth: true },
    sm: { height: 400, width: "auto", cellSize: 35, setParentWidth: true },
  });

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
        cellSize: chartDim.cellSize as number,
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
            offset: [-(chartDim.cellSize as number) / 2 + 10, -(chartDim.cellSize as number) / 2 + 10],
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
  }, [data, dateData, oneMonthAhead, today, chartDim]);

  useCharts(chartRef, option, chartClass, setChartClass);

  return (
    <div ref={chartParentRef} className="card" style={{ height: `${chartDim.height}px`, width: `${chartDim.width}px` }}>
      <div ref={chartRef} />
    </div>
  );
}
