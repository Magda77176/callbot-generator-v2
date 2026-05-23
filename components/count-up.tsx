'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  to: number;
  durationMs?: number;
  suffix?: string;
  className?: string;
}

/**
 * IntersectionObserver-triggered count-up. Runs once when the element scrolls
 * into view. Same trick Aigocy uses with `data-to` + `data-inviewport`.
 */
export function CountUp({ to, durationMs = 1500, suffix = '', className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const startedAt = performance.now();
            const tick = (now: number) => {
              const elapsed = now - startedAt;
              const progress = Math.min(1, elapsed / durationMs);
              // ease-out cubic
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.round(eased * to));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [to, durationMs]);

  return (
    <span ref={ref} className={className}>
      {value}
      {suffix}
    </span>
  );
}
