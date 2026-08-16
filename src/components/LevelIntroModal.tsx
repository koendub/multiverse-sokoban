export interface LevelIntroModalProps {
  readonly text: string;
  readonly onClose: () => void;
}

/** A dismissible popup showing a level's blurb - shown once automatically when the level starts, and again on demand via the top bar's info icon (see TopBar.tsx). */
export function LevelIntroModal({ text, onClose }: LevelIntroModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
      <div className="max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-center shadow-xl">
        <p className="text-sm text-slate-200">{text}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 rounded-md bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 transition-colors hover:bg-sky-500/30"
        >
          Okay
        </button>
      </div>
    </div>
  );
}
