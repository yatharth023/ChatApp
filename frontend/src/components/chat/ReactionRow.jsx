import { useMemo } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const ReactionRow = ({ reactions, onToggle }) => {
  const { user } = useAuth();
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of reactions ?? []) {
      const prev = map.get(r.emoji) ?? { emoji: r.emoji, users: [] };
      prev.users.push(r.userId);
      map.set(r.emoji, prev);
    }
    return Array.from(map.values());
  }, [reactions]);

  if (grouped.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {grouped.map(({ emoji, users }) => {
        const active = user && users.includes(user.id);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle?.(emoji)}
            className={clsx(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition',
              active
                ? 'border-brand-500 bg-brand-500/20 text-brand-200'
                : 'border-slate-700 bg-surface text-slate-300 hover:border-slate-600',
            )}
          >
            <span>{emoji}</span>
            <span>{users.length}</span>
          </button>
        );
      })}
    </div>
  );
};
