"use client";

import { useEffect, useRef, useState } from "react";

export function CountUp({ end, prefix = "", duration = 2000 }: { end: number; prefix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || hasRun.current) return;

      hasRun.current = true;
      let start = 0;
      const step = end / (duration / 16);
      const timer = window.setInterval(() => {
        start += step;
        if (start >= end) {
          setCount(end);
          window.clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
    });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}</span>;
}
