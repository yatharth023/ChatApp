import clsx from 'clsx';

export const Skeleton = ({ className }) => (
  <div className={clsx('animate-pulse rounded-md bg-slate-800/60', className)} />
);

export const ConversationSkeleton = () => (
  <div className="flex items-center gap-3 px-3 py-3">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  </div>
);

export const MessageSkeleton = () => (
  <div className="flex flex-col gap-3 px-4 py-6">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className={i % 2 === 0 ? 'self-start' : 'self-end'}>
        <Skeleton className={clsx('h-8 rounded-2xl', i % 2 === 0 ? 'w-56' : 'w-40')} />
      </div>
    ))}
  </div>
);
