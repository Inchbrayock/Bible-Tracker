import React, { useMemo, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { formatPlainDate } from '../../lib/dates';
import { useBibleStore } from '../../store/useBibleStore';
import type { AchievementCategory, AchievementStatus, AchievementTier } from '../../types/bible';
import { MedallionIcon } from './MedallionIcon';

interface AchievementsViewProps {
  onInspectAchievement: (achievement: AchievementStatus) => void;
}

const CATEGORIES: { id: 'all' | AchievementCategory; label: string }[] = [
  { id: 'all', label: 'All seals' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'divisions', label: 'Books & divisions' },
  { id: 'consistency', label: 'Consistency' },
  { id: 'habits', label: 'Habits' },
  { id: 'special', label: 'Secret seals' },
];

const TIER_ORDER: AchievementTier[] = ['bronze', 'silver', 'gold', 'luminous'];

const TIER_NAMES: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  luminous: 'Luminous',
};

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
    <div className="space-y-8">
      <section className="border-b border-[var(--border-subtle)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-[2.15rem]">
              Illuminated Hall of Seals
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)] tabular-nums">
              {unlockedCount} of {achievements.length} seals earned. Select any medallion to inspect its Scripture echo and progress.
            </p>
          </div>

          <div className="grid grid-cols-4 divide-x divide-[var(--border-subtle)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            {tierStats.map((t) => (
              <div key={t.tier} className="px-3.5 py-2 text-center">
                <p className="text-xs text-[var(--text-secondary)]">{TIER_NAMES[t.tier]}</p>
                <p className="mt-0.5 font-display text-base font-medium tabular-nums text-[var(--text-primary)]">
                  {t.earned}/{t.total}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                aria-pressed={category === cat.id}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
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
        <div className="folio-sheet p-10 text-center">
          <p className="font-display text-xl font-medium text-[var(--text-primary)]">
            No seals match this filter yet
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Uncheck “Earned only” or continue logging chapters to unlock your first seal.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const isHidden = Boolean(item.definition.secret && !item.unlocked);
            return (
              <button
                key={item.definition.id}
                type="button"
                onClick={() => onInspectAchievement(item)}
                className={`folio-sheet flex items-start gap-4 p-4 text-left transition-colors ${
                  item.unlocked
                    ? 'border-[color-mix(in_oklab,var(--color-accent)_48%,var(--border-subtle))] hover:border-[var(--color-accent)]'
                    : 'opacity-85 hover:border-[var(--border-strong)] hover:opacity-100'
                }`}
              >
                <MedallionIcon
                  motif={item.definition.motif}
                  tier={item.definition.tier}
                  unlocked={item.unlocked}
                  size={60}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--color-accent)]">
                      {item.unlocked ? (
                        <Check className="h-3 w-3 text-[var(--color-sage)]" aria-hidden="true" />
                      ) : (
                        <Lock className="h-3 w-3 text-[var(--text-secondary)]" aria-hidden="true" />
                      )}
                      {TIER_NAMES[item.definition.tier]}
                    </span>
                    {item.unlocked && item.unlockedAt ? (
                      <span className="tabular-nums text-[var(--color-sage)]">
                        {formatPlainDate(item.unlockedAt, { month: 'short', day: 'numeric' })}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-1 font-display text-lg font-medium leading-snug text-[var(--text-primary)]">
                    {isHidden ? 'Hidden Sanctuary Seal' : item.definition.title}
                  </h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {isHidden
                      ? 'Secret milestone waiting to be discovered.'
                      : item.definition.subtitle}
                  </p>

                  {!isHidden && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs tabular-nums text-[var(--text-secondary)]">
                        <span>{item.unlocked ? 'Earned' : 'Progress'}</span>
                        <span>
                          {item.current.toLocaleString()} / {item.target.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                        <div
                          className="h-full rounded-full transition-[width] duration-400"
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
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
