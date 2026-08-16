import { useEffect, useRef } from "react";
import type { DirectionName } from "../engine/multiverse/types.ts";

/** Below this distance (px), a touch is a tap, not a swipe - ignored. */
const SWIPE_THRESHOLD_PX = 40;

/** Touch analogue of useWasdControls.ts: one swipe up/down/left/right anywhere on the page triggers one move in that direction. */
export function useSwipeControls(onMove: (dir: DirectionName) => void): void {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function handleTouchStart(event: TouchEvent): void {
      const touch = event.touches[0];
      startRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }

    function handleTouchEnd(event: TouchEvent): void {
      const start = startRef.current;
      startRef.current = null;
      const touch = event.changedTouches[0];
      if (!start || !touch) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) return;

      const dir: DirectionName = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "Right" : "Left") : dy > 0 ? "Down" : "Up";
      onMove(dir);
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onMove]);
}
