import { useEffect, useState } from "react";

/**
 * The top bar becomes a right-side rail specifically on a phone turned
 * sideways: landscape orientation, and short enough (639px matches
 * Tailwind's `sm` breakpoint) that only a phone - not a tablet or desktop
 * window, which are also "landscape" by this definition - would be this
 * short. In landscape, height is the scarce dimension, so freeing up the
 * top strip for the board matters there; in portrait it's width that's
 * scarce and height is comparatively plentiful, so the ordinary top bar
 * (which already wraps onto extra rows if it doesn't fit - see TopBar.tsx)
 * is the better fit.
 */
const QUERY = "(orientation: landscape) and (max-height: 639px)";

export function useTopBarRail(): boolean {
  const [isRail, setIsRail] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handleChange = () => setIsRail(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isRail;
}
