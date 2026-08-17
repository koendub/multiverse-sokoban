import { useCallback, useEffect, useState } from "react";
import type { LevelDef } from "../engine/levels/level.ts";
import type { LevelViews } from "../engine/levels/jsonLevel.ts";
import type { DirectionName } from "../engine/multiverse/types.ts";
import { useMultiverse } from "../game/useMultiverse.ts";
import { useWasdControls } from "../game/useWasdControls.ts";
import { useSwipeControls } from "../game/useSwipeControls.ts";
import { useAdvanceKey } from "../game/useAdvanceKey.ts";
import { useUndoRestartKeys } from "../game/useUndoRestartKeys.ts";
import { useViewKeys } from "../game/useViewKeys.ts";
import type { ViewMode } from "../game/useViewKeys.ts";
import { starTierForMoves } from "../game/starRating.ts";
import { firstAvailableView, isViewAvailable } from "../game/viewAvailability.ts";
import { useElementSize } from "../game/useElementSize.ts";
import { useTopBarRail } from "../game/useTopBarRail.ts";
import { useIsPhone } from "../game/useIsPhone.ts";
import { fitTileSize } from "../game/fitTileSize.ts";
import { GameBoard } from "./GameBoard.tsx";
import { MultiBoardGrid } from "./MultiBoardGrid.tsx";
import { TopBar } from "./TopBar.tsx";
import { StarIcon } from "./StarIcon.tsx";
import { LevelIntroModal } from "./LevelIntroModal.tsx";
import { TouchControls } from "./TouchControls.tsx";
import { SolverPanel } from "./SolverPanel.tsx";

/** Tile size used before the board area's real size has been measured (see useElementSize.ts). */
const DEFAULT_TILE_SIZE = 48;
/** The bordered box around the active view has a 1px border on every side. */
const BOARD_BORDER_PX = 2;
/** Top padding used before the top bar's real height has been measured (bar layout, where it sits at the top). */
const DEFAULT_TOP_PADDING_PX = 80;
/** Right padding used before the top bar's real width has been measured (rail layout, on a sideways phone). */
const DEFAULT_RIGHT_PADDING_PX = 96;
/** Breathing room between the top bar and whatever's next to it. */
const TOP_BAR_GAP_PX = 16;
/** The rail layout doesn't need top padding reserved for the top bar (it's on the right there) - just enough for the safe area/general breathing room. */
const RAIL_TOP_PADDING_PX = 12;

export interface LevelPlayerProps {
  readonly levelNumber: number;
  readonly levelName: string;
  /** Optional blurb shown above the game render. Nothing is shown if omitted. */
  readonly levelText?: string;
  /** Move-count thresholds for the silver/gold star - see starRating.ts. */
  readonly levelGreat?: number;
  readonly levelPerfect?: number;
  readonly levelViews: LevelViews;
  readonly level: LevelDef;
  readonly hasNextLevel: boolean;
  readonly onAdvance: () => void;
  readonly onSolved: (moves: number) => void;
}

/**
 * Plays exactly one level. Mount a fresh instance per level (e.g. via a
 * `key={levelNumber}` from the parent) so its Multiverse resets cleanly
 * instead of trying to migrate state between unrelated levels.
 */
export function LevelPlayer({ levelNumber, levelName, levelText, levelGreat, levelPerfect, levelViews, level, hasNextLevel, onAdvance, onSolved }: LevelPlayerProps) {
  const {
    combinedScene,
    splitScenes,
    singleUniverseScene,
    stats,
    solved,
    universeIndex,
    moves,
    step,
    undo,
    restart,
    goToUniverse,
    cycleUniverse,
  } = useMultiverse(level, onSolved);

  const [viewMode, setViewMode] = useState<ViewMode>(() => firstAvailableView(levelViews, 0));

  // Switching views is always "go to this mode, and if it's the per-universe
  // one, reset which universe it's showing" - shared by picking a view by
  // hand and by the auto-fallback effect below, which needs the exact same
  // reset when it moves the player into view 3 on its own.
  const applyView = useCallback(
    (view: ViewMode) => {
      setViewMode(view);
      if (view === 3) goToUniverse(0);
    },
    [goToUniverse],
  );

  const selectView = useCallback(
    (view: ViewMode) => {
      if (!isViewAvailable(levelViews, view, moves)) return;
      if (view === 3 && viewMode === 3) {
        cycleUniverse();
      } else {
        applyView(view);
      }
    },
    [levelViews, moves, viewMode, cycleUniverse, applyView],
  );

  // A "before-moves" view stops being available the instant the player's
  // first move lands - if that was the view on screen, hop to the next
  // available one rather than leaving an unusable view showing.
  useEffect(() => {
    if (!isViewAvailable(levelViews, viewMode, moves)) {
      applyView(firstAvailableView(levelViews, moves));
    }
  }, [levelViews, viewMode, moves, applyView]);

  // Shown automatically once when the level starts (if it has a blurb), and
  // again on demand via the top bar's info icon - see LevelIntroModal.tsx.
  const [introOpen, setIntroOpen] = useState(Boolean(levelText));

  const move = useCallback(
    (dir: DirectionName) => {
      if (!solved && !introOpen) step(dir);
    },
    [solved, introOpen, step],
  );
  useWasdControls(move);
  useSwipeControls(move);
  useUndoRestartKeys(undo, restart);
  // Space closes the intro popup if it's open; only once it's closed does
  // Space fall through to advancing past a solved level - otherwise both
  // would fire on the same press whenever the player reopens the popup
  // (via the info icon) after already solving the level.
  useAdvanceKey(introOpen, () => setIntroOpen(false));
  useAdvanceKey(solved && !introOpen, onAdvance);
  useViewKeys(selectView);

  const [boardAreaRef, boardAreaSize] = useElementSize<HTMLDivElement>();
  const availableSize = { width: boardAreaSize.width - BOARD_BORDER_PX, height: boardAreaSize.height - BOARD_BORDER_PX };
  const combinedTileSize = fitTileSize(combinedScene.width, combinedScene.height, availableSize, DEFAULT_TILE_SIZE);
  const singleTileSize = fitTileSize(singleUniverseScene.width, singleUniverseScene.height, availableSize, DEFAULT_TILE_SIZE);

  // The top bar becomes a right-side rail on a sideways phone and wraps
  // onto extra rows on narrow-ish widths otherwise (see TopBar.tsx and
  // useTopBarRail.ts), so neither its height nor its width is fixed - a
  // static CSS offset would either waste space or, worse, undershoot and
  // let the board start underneath/behind it. Measuring it directly keeps
  // this correct at every size instead of guessing per breakpoint.
  const [topBarRef, topBarSize] = useElementSize<HTMLDivElement>();
  const isRail = useTopBarRail();
  const isPhone = useIsPhone();
  const topPadding = isRail ? RAIL_TOP_PADDING_PX : topBarSize.height > 0 ? topBarSize.height + TOP_BAR_GAP_PX : DEFAULT_TOP_PADDING_PX;
  const rightPadding = isRail ? (topBarSize.width > 0 ? topBarSize.width + TOP_BAR_GAP_PX : DEFAULT_RIGHT_PADDING_PX) : undefined;

  return (
    <div
      // `dvh` (dynamic viewport height) tracks the *currently visible* area
      // as the mobile browser's address bar shows/hides, unlike `vh`/`svh`
      // which lock to a fixed assumption and can leave content sized wrong
      // for whatever's actually on screen right now.
      className="flex h-dvh flex-col items-center gap-6 overflow-hidden bg-slate-950 pb-3 pl-2 pr-2 text-slate-100 sm:pb-8 sm:pl-4 sm:pr-4"
      style={{ paddingTop: topPadding, ...(rightPadding !== undefined && { paddingRight: rightPadding }) }}
    >
      <TopBar
        ref={topBarRef}
        levelNumber={levelNumber}
        levelName={levelName}
        stats={stats}
        view={viewMode}
        onSelectView={selectView}
        universeIndex={universeIndex}
        moves={moves}
        viewAvailability={{
          1: isViewAvailable(levelViews, 1, moves),
          2: isViewAvailable(levelViews, 2, moves),
          3: isViewAvailable(levelViews, 3, moves),
        }}
        hasIntroText={Boolean(levelText)}
        onShowIntro={() => setIntroOpen(true)}
        isRail={isRail}
      />

      {introOpen && levelText && <LevelIntroModal text={levelText} onClose={() => setIntroOpen(false)} />}

      {isPhone && <TouchControls onUndo={undo} onRestart={restart} />}

      <SolverPanel level={level} />

      {/*
       * This wrapper is the sizing source for the board(s) below: it's a
       * flex child that naturally shrinks to whatever room is left after
       * the top bar's reserved padding, the optional blurb, and the gaps
       * between them, and `useElementSize` reports its true pixel size so
       * `fitTileSize`/`MultiBoardGrid` can pick the largest tile size that
       * still fits without overflowing.
       */}
      <div ref={boardAreaRef} className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <div className="relative overflow-hidden rounded-xl border border-slate-700 shadow-lg">
          {/*
           * All three views stay mounted at all times, switching only via
           * `hidden` - this keeps each one's Pixi canvas(es) alive across
           * mode switches, so flipping between 1/2/3 never tears down and
           * re-initializes a board (which is what caused the flicker).
           */}
          <div className={viewMode === 1 ? undefined : "hidden"}>
            <GameBoard scene={combinedScene} tileSize={combinedTileSize} />
          </div>
          <div className={viewMode === 2 ? undefined : "hidden"}>
            <MultiBoardGrid scenes={splitScenes} availableSize={availableSize} />
          </div>
          <div className={viewMode === 3 ? undefined : "hidden"}>
            <GameBoard scene={singleUniverseScene} tileSize={singleTileSize} />
          </div>
          {solved && (
            <div
              // On a phone there's no space bar to press, so the whole
              // overlay becomes the affordance instead - tapping it advances
              // directly rather than just repeating an instruction the
              // player has no way to follow.
              className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/85 text-center ${
                isPhone && hasNextLevel ? "cursor-pointer" : ""
              }`}
              onClick={isPhone && hasNextLevel ? onAdvance : undefined}
            >
              <StarIcon tier={starTierForMoves(moves, { great: levelGreat, perfect: levelPerfect })} className="h-10 w-10" />
              <span className="text-xl font-semibold text-emerald-400">Congratz!</span>
              <span className="text-sm text-slate-200">
                {hasNextLevel ? (isPhone ? "Tap to go to the next level" : "Press space to go to the next level") : "You've completed every level!"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
