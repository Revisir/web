import * as echarts from "echarts";
import { type Dispatch, type RefObject, type SetStateAction, useEffect } from "react";

export default function useCharts(chartRef: RefObject<HTMLDivElement | null>, option: echarts.EChartsOption, chartClass: echarts.ECharts | undefined, setChartClass: Dispatch<SetStateAction<echarts.ECharts | undefined>>) {
  useEffect(() => {
    if (!chartRef.current || chartClass) return;
    const chart = echarts.init(chartRef.current, null, {
      renderer: "svg",
      useDirtyRect: false,
    });
    chart.setOption(option);
    setChartClass(chart);

    return () => {
      if (chartClass) echarts.dispose(chartClass);
    };
  }, [chartClass, option, chartRef, setChartClass]);
}
