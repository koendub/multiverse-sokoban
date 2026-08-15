import { useCallback, useEffect, useState } from "react";
import { getLevelCatalog } from "../game/levelCatalog.ts";
import { loadStoredLevelNumber, saveLevelNumber } from "../game/levelProgress.ts";
import { getAllBestMoves, recordSolve } from "../game/levelScores.ts";
import { LevelPlayer } from "./LevelPlayer.tsx";
import { LevelSidebar } from "./LevelSidebar.tsx";

/**
 * Owns level progression: which level is current (persisted to
 * localStorage so reloading the site resumes where the player left off),
 * advancing to the next one or jumping to any level from the sidebar, and
 * each level's best (fewest-move) solve. Renders exactly one
 * <LevelPlayer>, keyed by level number so it remounts (and its Multiverse
 * resets) on every level change.
 */
export function GameApp() {
  const catalog = getLevelCatalog();
  const [levelNumber, setLevelNumber] = useState(() => loadStoredLevelNumber(catalog));
  const [bestMoves, setBestMoves] = useState(() => getAllBestMoves());

  useEffect(() => {
    saveLevelNumber(levelNumber);
  }, [levelNumber]);

  const index = catalog.findIndex((entry) => entry.number === levelNumber);
  const current = catalog[index] ?? catalog[0];
  const next = catalog[index + 1];

  const goToLevel = useCallback((number: number) => {
    setLevelNumber(number);
  }, []);

  const goToNextLevel = useCallback(() => {
    if (next) setLevelNumber(next.number);
  }, [next]);

  const handleLevelSolved = useCallback(
    (moves: number) => {
      setBestMoves(recordSolve(levelNumber, moves));
    },
    [levelNumber],
  );

  if (!current) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-950 text-slate-100">
        <p>No levels found.</p>
      </div>
    );
  }

  return (
    <>
      <LevelSidebar levels={catalog} currentLevel={current.number} bestMoves={bestMoves} onSelect={goToLevel} />
      <LevelPlayer
        key={current.number}
        levelNumber={current.number}
        levelName={current.name}
        levelText={current.text}
        levelGreat={current.great}
        levelPerfect={current.perfect}
        levelViews={current.views}
        level={current.level}
        hasNextLevel={Boolean(next)}
        onAdvance={goToNextLevel}
        onSolved={handleLevelSolved}
      />
    </>
  );
}
