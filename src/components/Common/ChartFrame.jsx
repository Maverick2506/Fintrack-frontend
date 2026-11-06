import { useLayoutEffect, useRef, useState } from "react";

/**
 * The box a Recharts ResponsiveContainer sits in. The chart is only rendered while the box has a
 * size, so a chart in a section hidden on phones (display: none) doesn't render at 0×0 and log
 * Recharts' width(0)/height(0) warning. It appears as soon as its section is shown.
 */
const ChartFrame = ({ className, style, children }) => {
  const ref = useRef(null);
  const [hasSize, setHasSize] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setHasSize(width > 0 && height > 0);
    };
    if (typeof ResizeObserver === "undefined") {
      measure();
      return undefined;
    }
    // Fires once on observe, then whenever the box appears, disappears or resizes
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      {hasSize ? children : null}
    </div>
  );
};

export default ChartFrame;
