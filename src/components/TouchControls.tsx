export interface TouchControlsProps {
  readonly onUndo: () => void;
  readonly onRestart: () => void;
}

/**
 * Undo/restart buttons for phones (R/F cover this elsewhere) - swiping
 * handles movement, see useSwipeControls.ts. The caller decides whether to
 * mount this at all (see useIsPhone.ts) - a plain `sm:hidden` here would be
 * wrong on a sideways phone, which is still phone-sized but well past the
 * `sm` *width* breakpoint.
 *
 * Anchored to the bottom-right corner rather than vertically centered:
 * `position: fixed` elements positioned via `top`/height-percentage are
 * notoriously unreliable on mobile browsers once the address bar's dynamic
 * show/hide is involved (the offset can resolve against a taller viewport
 * than what's actually visible, pushing the buttons off-screen). Anchoring
 * to `bottom`/`right` sidesteps that, and the safe-area insets keep the
 * buttons clear of the home-indicator/notch area on devices that have one.
 */
export function TouchControls({ onUndo, onRestart }: TouchControlsProps) {
  return (
    <div
      className="fixed z-40 flex flex-col gap-3"
      style={{ right: "calc(0.75rem + env(safe-area-inset-right))", bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={onUndo}
        aria-label="Undo last move"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-200 shadow-lg active:bg-slate-800"
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        onClick={onRestart}
        aria-label="Restart level"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-200 shadow-lg active:bg-slate-800"
      >
        <RestartIcon />
      </button>
    </div>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 7L4 12l5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12h11a5 5 0 0 1 0 10h-1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 12a8 8 0 1 1 2.5 5.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
