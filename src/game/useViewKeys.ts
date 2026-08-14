import { useEffect } from "react";

export type ViewMode = 1 | 2 | 3;

/** 1/2/3 select a view. Always active, independent of the solved/movement lock. */
export function useViewKeys(onSelectView: (view: ViewMode) => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "1" && event.key !== "2" && event.key !== "3") return;
      event.preventDefault();
      onSelectView(Number(event.key) as ViewMode);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelectView]);
}
