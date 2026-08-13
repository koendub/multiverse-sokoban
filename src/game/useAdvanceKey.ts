import { useEffect } from "react";

/** Calls `onAdvance` when Space is pressed, but only while `enabled`. */
export function useAdvanceKey(enabled: boolean, onAdvance: () => void): void {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== " " && event.code !== "Space") return;
      event.preventDefault();
      onAdvance();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onAdvance]);
}
