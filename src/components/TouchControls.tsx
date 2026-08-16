export interface TouchControlsProps {
  readonly onUndo: () => void;
  readonly onRestart: () => void;
}

/** Undo/restart buttons for phones (hidden from `sm` up, where R/F cover this) - swiping handles movement, see useSwipeControls.ts. */
export function TouchControls({ onUndo, onRestart }: TouchControlsProps) {
  return (
    <div className="fixed right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3 sm:hidden">
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
