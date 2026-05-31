import * as echarts from "echarts";
import { useMemo, useState } from "react";
import useDynamicWidth from "../../hooks/useDynamicWidth";
import useCharts from "../../hooks/useCharts";

export default function SunBurstBook({ data }) {
  const [chartClass, setChartClass] = useState<echarts.ECharts>();
  const { chartRef, chartParentRef, chartDim } = useDynamicWidth(chartClass, {
    lg: { height: 400, width: 400, setParentWidth: false },
    md: { height: 400, width: 400, setParentWidth: false },
    sm: { height: 350, width: "auto", setParentWidth: true },
  });
  const colors: string[] = useMemo(() => ["#003f5c", "#58508d", "#c7522a", "#ff6361", "#74a892", "#008585", "#9A2555"], []);
  const bgColor = "#2E2733";

  const option: echarts.EChartsOption = useMemo(
    () => ({
      // backgroundColor: bgColor,
      left: "center",
      top: "center",
      color: colors,
      tooltip: {
        showContent: true,
      },

      series: [
        {
          type: "sunburst",
          center: ["50%", "48%"],
          data: data,
          sort: function (a, b) {
            if (a.depth === 1) {
              return b.getValue() - a.getValue();
            } else {
              return a.dataIndex - b.dataIndex;
            }
          },
          label: {
            rotate: "radial",
            color: bgColor,
            valueAnimation: true,
          },
          itemStyle: {
            borderColor: bgColor,
            borderWidth: 2,
          },
          levels: [
            {
              radius: [10, 40],

              label: {
                rotate: 0,
              },
            },
            {
              radius: [40, 125],
              label: {
                fontSize: 10,
                color: "#fff",
              },
            },
            {
              radius: [135, 160],
              itemStyle: {
                shadowBlur: 2,
                shadowColor: colors[2],
                color: "transparent",
              },
              label: {
                rotate: "tangential",
                fontSize: 10,
              },
            },
            {
              radius: [160, 165],
              itemStyle: {
                shadowBlur: 80,
                shadowColor: colors[0],
              },
              label: {
                position: "outside",
                textShadowBlur: 5,
                textShadowColor: "#333",
              },
            },
          ],
        },
      ],
    }),
    [data, colors],
  );

  useCharts(chartRef, option, chartClass, setChartClass);

  return (
    <div ref={chartParentRef} className="card" style={{ border: 0 }}>
      <div ref={chartRef} />
    </div>
  );
}
