import { useCallback, useRef, useState } from "react";

export default function useHover() {
  const [isHovering, setIsHovering] = useState(false);
  const prevRef = useRef<Node>(null);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => setIsHovering(false), []);

  const customRef = useCallback(
    (node: Node) => {
      if (prevRef.current?.nodeType === Node.ELEMENT_NODE) {
        prevRef.current.removeEventListener("mouseenter", handleMouseEnter);
        prevRef.current.removeEventListener("mouseleave", handleMouseLeave);
      }
      if (node?.nodeType === Node.ELEMENT_NODE) {
        node.addEventListener("mouseenter", handleMouseEnter);
        node.addEventListener("mouseleave", handleMouseLeave);
      }

      prevRef.current = node;
    },
    [handleMouseEnter, handleMouseLeave],
  );

  return [customRef, isHovering] as const;
}
