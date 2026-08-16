import { useEffect, useState } from "react";

/**
 * Phone-sized in whichever dimension is currently the constrained one: in
 * portrait that's width, in landscape it's height (see useTopBarRail.ts,
 * which uses the landscape half of this same idea to decide when the top
 * bar becomes a rail). 639px matches Tailwind's `sm` breakpoint, so this
 * agrees with `sm:` classes used elsewhere instead of drawing its own line.
 */
const QUERY = "(max-width: 639px) and (orientation: portrait), (max-height: 639px) and (orientation: landscape)";

export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handleChange = () => setIsPhone(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isPhone;
}
