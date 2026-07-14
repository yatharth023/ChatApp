import clsx from 'clsx';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
};

const initialsOf = (username = '?') => username.trim().slice(0, 2).toUpperCase();

const hueFrom = (seed = '') => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
};

export const Avatar = ({ user, size = 'md', className, isOnline }) => {
  const url = user?.avatarUrl;
  const hue = hueFrom(user?.id ?? user?.username ?? '');
  return (
    <div className={clsx('relative shrink-0', className)}>
      {url ? (
        <img
          alt={user?.username ?? 'avatar'}
          src={url}
          className={clsx(SIZES[size], 'rounded-full object-cover ring-1 ring-surface-border')}
        />
      ) : (
        <div
          className={clsx(
            SIZES[size],
            'flex items-center justify-center rounded-full font-semibold uppercase text-white ring-1 ring-surface-border',
          )}
          style={{ background: `hsl(${hue} 70% 40%)` }}
        >
          {initialsOf(user?.username)}
        </div>
      )}
      {typeof isOnline === 'boolean' && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-surface',
            isOnline ? 'bg-emerald-400' : 'bg-slate-500',
          )}
        />
      )}
    </div>
  );
};
