import {
  format,
  formatDistanceToNow,
  isSameDay,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
} from 'date-fns';

const toDate = (v) => (v instanceof Date ? v : new Date(v));

export const formatMessageTime = (value) => format(toDate(value), 'HH:mm');

export const formatDayLabel = (value) => {
  const d = toDate(value);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEEE');
  if (isThisYear(d)) return format(d, 'd MMM');
  return format(d, 'd MMM yyyy');
};

export const formatRelative = (value) => {
  if (!value) return 'a moment ago';
  return `${formatDistanceToNow(toDate(value))} ago`;
};

export const formatLastSeen = (value, isOnline) => {
  if (isOnline) return 'online';
  if (!value) return 'offline';
  const d = toDate(value);
  if (isToday(d)) return `last seen today at ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `last seen yesterday at ${format(d, 'HH:mm')}`;
  return `last seen ${format(d, 'd MMM, HH:mm')}`;
};

export const isNewDay = (prev, next) => {
  if (!prev) return true;
  return !isSameDay(toDate(prev.createdAt), toDate(next.createdAt));
};
