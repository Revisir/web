import * as echarts from "echarts";
import { type Dispatch, type RefObject, type SetStateAction, useEffect } from "react";

/**
 * Creates one ECharts instance on `chartRef`'s element, applies `option` to it each time the
 * option object changes (new data or a theme switch), and disposes the instance on unmount.
 * The instance lives in the caller's state so useDynamicWidth can resize it.
 */
export default function useCharts(chartRef: RefObject<HTMLDivElement | null>, option: echarts.EChartsOption, chartClass: echarts.ECharts | undefined, setChartClass: Dispatch<SetStateAction<echarts.ECharts | undefined>>) {
  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const chart = echarts.init(element, null, {
      renderer: "svg",
      useDirtyRect: false,
    });
    setChartClass(chart);

    return () => {
      chart.dispose();
      setChartClass(undefined);
    };
  }, [chartRef, setChartClass]);

  useEffect(() => {
    chartClass?.setOption(option);
  }, [chartClass, option]);
}
