import { HiCheck, HiXMark } from 'react-icons/hi2';
import { Avatar } from '../common/Avatar.jsx';
import { useFriendshipMutations } from '../../hooks/useFriends.js';

/**
 * Renders incoming pending requests with accept/decline actions. Rendered
 * inline in the sidebar (not a modal) so users can act on new requests
 * without leaving the chat context.
 */
export const FriendRequestList = ({ incoming }) => {
  const { accept, decline } = useFriendshipMutations();
  if (!incoming || incoming.length === 0) return null;

  return (
    <div className="border-b border-surface-border">
      <div className="flex items-center justify-between px-3 pt-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Friend requests
        </h3>
        <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
          {incoming.length}
        </span>
      </div>
      <ul className="space-y-1 p-2">
        {incoming.map((req) => (
          <li
            key={req.friendshipId}
            className="flex items-center gap-3 rounded-lg bg-surface-raised/60 p-2"
          >
            <Avatar user={req.from} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">{req.from.username}</p>
              <p className="text-[10px] text-slate-500">wants to be friends</p>
            </div>
            <button
              type="button"
              onClick={() => accept.mutate(req.from.id)}
              className="rounded-md bg-brand-600 p-1.5 text-white hover:bg-brand-500"
              aria-label="Accept"
              title="Accept"
              disabled={accept.isPending}
            >
              <HiCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => decline.mutate(req.from.id)}
              className="rounded-md bg-slate-700 p-1.5 text-slate-100 hover:bg-slate-600"
              aria-label="Decline"
              title="Decline"
              disabled={decline.isPending}
            >
              <HiXMark className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
