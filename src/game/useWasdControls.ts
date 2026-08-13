import { useEffect } from "react";
import type { DirectionName } from "../engine/multiverse/types.ts";

const KEY_TO_DIRECTION: Readonly<Record<string, DirectionName>> = {
  w: "Up",
  a: "Left",
  s: "Down",
  d: "Right",
};

/** Moves the player with W/A/S/D, applied to every universe at once. */
export function useWasdControls(onMove: (dir: DirectionName) => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const dir = KEY_TO_DIRECTION[event.key.toLowerCase()];
      if (!dir) return;
      event.preventDefault();
      onMove(dir);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onMove]);
}
