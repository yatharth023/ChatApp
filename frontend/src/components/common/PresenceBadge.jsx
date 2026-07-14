import clsx from 'clsx';
import { formatLastSeen } from '../../utils/date.js';

export const PresenceBadge = ({ isOnline, lastSeenAt, className }) => (
  <div className={clsx('flex items-center gap-2 text-xs', className)}>
    <span className={clsx('h-2 w-2 rounded-full', isOnline ? 'bg-emerald-400' : 'bg-slate-500')} />
    <span className={clsx(isOnline ? 'text-emerald-300' : 'text-slate-400')}>
      {formatLastSeen(lastSeenAt, isOnline)}
    </span>
  </div>
);
