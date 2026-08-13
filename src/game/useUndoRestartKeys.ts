import { useEffect } from "react";

/** R undoes the last move, F restarts the level - active regardless of solved state. */
export function useUndoRestartKeys(onUndo: () => void, onRestart: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        onUndo();
      } else if (key === "f") {
        event.preventDefault();
        onRestart();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUndo, onRestart]);
}
