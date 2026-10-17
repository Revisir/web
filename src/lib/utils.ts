import { createCn } from "cn/config";

// The Stitch type scale in src/index.css adds font sizes that cn would otherwise read as text
// colors, dropping either the size or the color when both are merged.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display-lg", "headline-lg", "headline-md", "headline-sm", "body-lg", "body-md", "body-sm", "label-md", "label-sm", "mono-lg", "mono-md", "mono-sm"] }],
    },
  },
});
