import * as echarts from "echarts";
import { useEffect } from "react";
import { useRef } from "react";

export default function SunBurstBook({ data }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartClassRef = useRef<echarts.ECharts>(null);
  const colors = ["#003f5c", "#58508d", "#c7522a", "#ff6361", "#74a892", "#008585", "#9A2555"];
  const bgColor = "#2E2733";

  //   for (let j = 0; j < data.length; ++j) {
  //     let level1 = data[j].children;
  //     for (let i = 0; i < level1.length; ++i) {
  //       let block = level1[i].children;
  //       let bookScore = [];
  //       let bookScoreId;
  //       for (let star = 0; star < block.length; ++star) {
  //         let style = (function (name) {
  //           switch (name) {
  //             case "5☆":
  //               bookScoreId = 0;
  //               return itemStyle.star5;
  //             case "4☆":
  //               bookScoreId = 1;
  //               return itemStyle.star4;
  //             case "3☆":
  //               bookScoreId = 2;
  //               return itemStyle.star3;
  //             case "2☆":
  //               bookScoreId = 3;
  //               return itemStyle.star2;
  //           }
  //         })(block[star].name);

  //         block[star].label = {
  //           color: style.color,
  //           downplay: {
  //             opacity: 0.5,
  //           },
  //         };
  //         if (block[star].children) {
  //           style = {
  //             opacity: 1,
  //             color: style.color,
  //           };
  //           block[star].children.forEach(function (book) {
  //             book.value = 1;
  //             book.itemStyle = style;
  //             book.label = {
  //               color: style.color,
  //             };
  //             let value = 1;
  //             if (bookScoreId === 0 || bookScoreId === 3) {
  //               value = 5;
  //             }
  //             if (bookScore[bookScoreId]) {
  //               bookScore[bookScoreId].value += value;
  //             } else {
  //               bookScore[bookScoreId] = {
  //                 color: colors[bookScoreId],
  //                 value: value,
  //               };
  //             }
  //           });
  //         }
  //       }
  //       level1[i].itemStyle = {
  //         color: data[j].itemStyle.color,
  //       };
  //     }
  //   }
  const option: echarts.EChartsOption = {
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
  };

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
  }, [chartRef]);

  return (
    <div className="card">
      <div ref={chartRef} style={{ height: "350px", width: "400px" }} />
    </div>
  );
}
