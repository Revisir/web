import { useEffect, useMemo, useRef, useState } from "react";
import useDimensions from "./useDimensions";

interface ChartDimConfig {
  height: number;
  width: number | "auto";
  cellSize?: number;
  setParentWidth?: boolean;
}

interface Breakpoints {
  lg?: ChartDimConfig;
  md?: ChartDimConfig;
  sm?: ChartDimConfig;
}

const defaultBreakpoints: Breakpoints = {
  lg: { height: 400, width: 400, cellSize: 40 },
  md: { height: 400, width: 400, cellSize: 40 },
  sm: { height: 400, width: "auto", cellSize: 30 },
};

function useDynamicWidth(chartObject: echarts.ECharts | undefined, breakpoints: Breakpoints = defaultBreakpoints) {
  const dimension = useDimensions();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartParentRef = useRef<HTMLDivElement>(null);
  const bp = useMemo(() => ({ ...defaultBreakpoints, ...breakpoints }), [breakpoints]);

  const activeConfig = useMemo((): ChartDimConfig => {
    const vw = dimension.width;
    if (vw >= 992) return bp.lg!;
    if (vw >= 768) return bp.md!;
    return bp.sm!;
  }, [dimension, bp]);

  const [chartDim, setChartDim] = useState<ChartDimConfig>(() => resolveConfig(activeConfig));

  useEffect(() => {
    function updateDim() {
      let gpWidth: number | undefined;
      if (chartParentRef.current) {
        gpWidth = chartParentRef.current.parentElement?.getBoundingClientRect().width;
        gpWidth = gpWidth ? gpWidth - 2 : undefined;
      }
      setChartDim(resolveConfig(activeConfig, gpWidth));
    }
    updateDim();
  }, [activeConfig]);

  useEffect(() => {
    const w = chartDim.width as number;
    const h = chartDim.height as number;
    chartObject?.resize({ width: w, height: h });
    if (chartRef.current) {
      chartRef.current.style.width = `${w - 5}px`;
      chartRef.current.style.height = `${h - 5}px`;
    }
    if (chartParentRef.current && chartDim.setParentWidth) {
      chartParentRef.current.style.width = `${w}px`;
      chartParentRef.current.style.height = `${h}px`;
    }
  }, [chartDim, chartObject]);

  return { chartRef, chartParentRef, chartDim };
}

function resolveConfig(config: ChartDimConfig, gpWidth?: number): ChartDimConfig {
  return {
    ...config,
    width: config.width === "auto" ? (gpWidth ?? 360) : config.width,
  };
}

export default useDynamicWidth;
