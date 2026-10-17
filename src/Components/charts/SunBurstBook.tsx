import * as echarts from "echarts";
import { useMemo, useState } from "react";
import useDynamicWidth from "../../hooks/useDynamicWidth";
import useCharts from "../../hooks/useCharts";
import useThemeColors, { type ThemeColors } from "@/hooks/useThemeColors";

/** A subject's Due or Revised ring. The statistics response gives each one fixed colors. */
interface SubjectRing {
  name: string;
  value: number;
  itemStyle?: { shadowColor?: string };
  label?: { color?: string };
}

interface SubjectNode {
  name: string;
  children: SubjectRing[];
}

interface SunBurstBookProps {
  data: SubjectNode[];
}

// Module-level so useDynamicWidth sees the same object on every render.
const BREAKPOINTS = {
  lg: { height: 400, width: 400, setParentWidth: false },
  md: { height: 400, width: 400, setParentWidth: false },
  sm: { height: 350, width: "auto" as const, setParentWidth: true },
};

export default function SunBurstBook({ data }: SunBurstBookProps) {
  const [chartClass, setChartClass] = useState<echarts.ECharts>();
  const { chartRef, chartParentRef } = useDynamicWidth(chartClass, BREAKPOINTS);
  const colors = useThemeColors();

  const option = useMemo<echarts.EChartsOption>(() => {
    // Segment labels and borders use the page background, which contrasts with the chart tokens in both themes.
    const gapColor = colors.background;
    return {
      left: "center",
      top: "center",
      color: colors.chart,
      tooltip: {
        showContent: true,
        backgroundColor: colors.surfaceContainer,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
      },

      series: [
        {
          type: "sunburst",
          center: ["50%", "48%"],
          data: withTokenColors(data, colors),
          sort: function (a, b) {
            if (a.depth === 1) {
              return b.getValue() - a.getValue();
            } else {
              return a.dataIndex - b.dataIndex;
            }
          },
          label: {
            rotate: "radial",
            color: gapColor,
            valueAnimation: true,
          },
          itemStyle: {
            borderColor: gapColor,
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
                color: gapColor,
              },
            },
            {
              radius: [135, 160],
              itemStyle: {
                shadowBlur: 2,
                shadowColor: colors.chart[2],
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
                shadowColor: colors.chart[0],
              },
              label: {
                position: "outside",
                textShadowBlur: 5,
                textShadowColor: gapColor,
              },
            },
          ],
        },
      ],
    };
  }, [data, colors]);

  useCharts(chartRef, option, chartClass, setChartClass);

  return (
    <div ref={chartParentRef} className="card" style={{ border: 0 }}>
      <div ref={chartRef} />
    </div>
  );
}

/**
 * Item styles override the series and level styles, so the response's hardcoded ring colors are
 * replaced here: Due rings take the warning token and Revised rings the success token.
 */
function withTokenColors(data: SubjectNode[], colors: ThemeColors): SubjectNode[] {
  return (data ?? []).map((subject) => ({
    ...subject,
    children: (subject.children ?? []).map((ring) => {
      const color = ring.name === "Due" ? colors.warning : ring.name === "Revised" ? colors.success : colors.mutedForeground;
      return { ...ring, itemStyle: { ...ring.itemStyle, shadowColor: color }, label: { ...ring.label, color } };
    }),
  }));
}
