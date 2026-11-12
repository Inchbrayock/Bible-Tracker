import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Award, Lock, Sparkles } from 'lucide-react';
import { formatPlainDate } from '../../lib/dates';
import { useBibleStore } from '../../store/useBibleStore';
import type { AchievementCategory, AchievementStatus, AchievementTier } from '../../types/bible';
import { MedallionIcon } from './MedallionIcon';

interface AchievementsViewProps {
  onInspectAchievement: (achievement: AchievementStatus) => void;
}

const CATEGORIES: { id: 'all' | AchievementCategory; label: string }[] = [
  { id: 'all', label: 'All Seals' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'divisions', label: 'Books & Divisions' },
  { id: 'consistency', label: 'Consistency' },
  { id: 'habits', label: 'Habits' },
  { id: 'special', label: 'Secret Seals' },
];

const TIER_ORDER: AchievementTier[] = ['bronze', 'silver', 'gold', 'luminous'];

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  onInspectAchievement,
}) => {
  const { achievements } = useBibleStore();
  const [category, setCategory] = useState<'all' | AchievementCategory>('all');
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const tierStats = useMemo(() => {
    return TIER_ORDER.map((tier) => {
      const allInTier = achievements.filter((a) => a.definition.tier === tier);
      const earnedInTier = allInTier.filter((a) => a.unlocked);
      return { tier, earned: earnedInTier.length, total: allInTier.length };
    });
  }, [achievements]);

  const filtered = useMemo(() => {
    return achievements
      .filter((a) => {
        if (category !== 'all' && a.definition.category !== category) return false;
        if (onlyUnlocked && !a.unlocked) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return b.percentage - a.percentage;
      });
  }, [achievements, category, onlyUnlocked]);

  return (
    <div className="space-y-6">
      <section className="sanctuary-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              <Award className="h-4 w-4" aria-hidden="true" />
              <span>Illuminated Hall of Seals</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              {unlockedCount} of {achievements.length} Seals Earned
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Click any medallion to inspect its Scripture echo, 3D relief, and progress.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tierStats.map((t) => (
              <div
                key={t.tier}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-center"
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  {t.tier}
                </p>
                <p className="mt-0.5 font-display text-base font-semibold tabular-nums text-[var(--text-primary)]">
                  {t.earned}/{t.total}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                aria-pressed={category === cat.id}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  category === cat.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={onlyUnlocked}
              onChange={(e) => setOnlyUnlocked(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span>Earned only</span>
          </label>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="sanctuary-card p-8 text-center">
          <p className="font-display text-lg font-semibold text-[var(--text-primary)]">
            No seals match this filter yet
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Uncheck “Earned only” or continue logging chapters to unlock your first seal.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, idx) => {
            const isHidden = Boolean(item.definition.secret && !item.unlocked);
            return (
              <motion.button
                key={item.definition.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.025, 0.3) }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => onInspectAchievement(item)}
                className={`sanctuary-card sheen-overlay flex items-start gap-4 p-4 text-left transition-colors ${
                  item.unlocked
                    ? 'border-[color-mix(in_oklab,var(--color-accent)_45%,var(--border-subtle))]'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                <MedallionIcon
                  motif={item.definition.motif}
                  tier={item.definition.tier}
                  unlocked={item.unlocked}
                  size={66}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                      {item.unlocked ? (
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Lock className="h-3 w-3 text-[var(--text-secondary)]" aria-hidden="true" />
                      )}
                      {item.definition.tier}
                    </span>
                    {item.unlocked && item.unlockedAt ? (
                      <span className="text-[0.68rem] font-medium tabular-nums text-[var(--color-sage)]">
                        {formatPlainDate(item.unlockedAt, { month: 'short', day: 'numeric' })}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-0.5 font-display text-lg font-semibold leading-snug text-[var(--text-primary)]">
                    {isHidden ? 'Hidden Sanctuary Seal' : item.definition.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {isHidden
                      ? 'Secret milestone waiting to be discovered.'
                      : item.definition.subtitle}
                  </p>

                  {!isHidden && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[0.7rem] font-medium tabular-nums text-[var(--text-secondary)]">
                        <span>{item.unlocked ? 'Unlocked' : 'Progress'}</span>
                        <span>
                          {item.current.toLocaleString()} / {item.target.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.unlocked
                              ? 'var(--color-sage)'
                              : 'var(--color-accent)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};
