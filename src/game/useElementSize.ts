import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface ElementSize {
  readonly width: number;
  readonly height: number;
}

const ZERO_SIZE: ElementSize = { width: 0, height: 0 };

/**
 * Tracks an element's content-box size via ResizeObserver, re-rendering
 * whenever it changes (e.g. the window resizing, or a flex sibling growing
 * or shrinking). Starts at {0, 0} until the first observation fires -
 * callers should treat that as "not measured yet" rather than "no space".
 */
export function useElementSize<T extends HTMLElement>(): [RefObject<T | null>, ElementSize] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>(ZERO_SIZE);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
