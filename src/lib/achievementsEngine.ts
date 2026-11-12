import { ACHIEVEMENTS_CATALOG } from '../data/achievementsCatalog';
import { BOOKS_BY_ID } from '../data/bibleCanon';
import type {
  AchievementStatus,
  BibleProgressSummary,
  ReadingLogEntry,
} from '../types/bible';

export function evaluateAchievements(
  logs: ReadingLogEntry[],
  summary: BibleProgressSummary
): AchievementStatus[] {
  const ctx = {
    logs,
    summary,
    booksById: BOOKS_BY_ID,
  };

  return ACHIEVEMENTS_CATALOG.map((definition) => {
    const { current, unlockedAt } = definition.evaluate(ctx);
    const clampedCurrent = Math.min(Math.max(0, current), definition.target);
    const unlocked = unlockedAt !== null && clampedCurrent >= definition.target;
    const percentage = Math.min(100, (clampedCurrent / definition.target) * 100);

    return {
      definition,
      unlocked,
      unlockedAt,
      current: clampedCurrent,
      target: definition.target,
      percentage,
    };
  });
}
