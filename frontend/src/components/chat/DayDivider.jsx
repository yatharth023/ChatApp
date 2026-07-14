import { formatDayLabel } from '../../utils/date.js';

export const DayDivider = ({ date }) => (
  <div className="sticky top-2 z-10 mx-auto my-3 w-fit rounded-full border border-surface-border bg-surface-raised/90 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-300 backdrop-blur">
    {formatDayLabel(date)}
  </div>
);
