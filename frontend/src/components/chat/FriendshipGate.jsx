import { HiOutlineUserPlus, HiCheck, HiXMark, HiClock, HiOutlineNoSymbol } from 'react-icons/hi2';
import { FRIEND_STATUS } from '../../utils/constants.js';
import { useFriendshipMutations } from '../../hooks/useFriends.js';

/**
 * Rendered in place of the message composer whenever the two users aren't
 * ACCEPTED friends. Shows the correct call-to-action for the current
 * friendship state so users always know how to move forward.
 */
export const FriendshipGate = ({ peer, status }) => {
  const { sendRequest, accept, decline, cancel } = useFriendshipMutations();

  if (peer?.hasBlockedYou) {
    return (
      <Banner
        icon={<HiOutlineNoSymbol className="h-5 w-5 text-rose-400" />}
        title={`${peer.username} isn't accepting messages`}
        description="You can't send messages to this account."
      />
    );
  }
  if (peer?.isBlockedByYou) {
    return (
      <Banner
        icon={<HiOutlineNoSymbol className="h-5 w-5 text-rose-400" />}
        title={`You've blocked ${peer.username}`}
        description="Unblock them from Settings to start a conversation."
      />
    );
  }

  if (status === FRIEND_STATUS.NONE) {
    return (
      <Banner
        icon={<HiOutlineUserPlus className="h-5 w-5 text-brand-300" />}
        title={`Send ${peer.username} a friend request`}
        description="You'll be able to message each other once they accept."
        actions={
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={sendRequest.isPending}
            onClick={() => sendRequest.mutate(peer.id)}
          >
            <HiOutlineUserPlus className="mr-1 h-4 w-4" />
            Send request
          </button>
        }
      />
    );
  }

  if (status === FRIEND_STATUS.PENDING_OUTGOING) {
    return (
      <Banner
        icon={<HiClock className="h-5 w-5 text-amber-300" />}
        title="Waiting for acceptance"
        description={`We'll let you know as soon as ${peer.username} responds.`}
        actions={
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(peer.id)}
          >
            Cancel request
          </button>
        }
      />
    );
  }

  if (status === FRIEND_STATUS.PENDING_INCOMING) {
    return (
      <Banner
        icon={<HiOutlineUserPlus className="h-5 w-5 text-brand-300" />}
        title={`${peer.username} wants to be friends`}
        description="Accept to start messaging."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={accept.isPending}
              onClick={() => accept.mutate(peer.id)}
            >
              <HiCheck className="mr-1 h-4 w-4" />
              Accept
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={decline.isPending}
              onClick={() => decline.mutate(peer.id)}
            >
              <HiXMark className="mr-1 h-4 w-4" />
              Decline
            </button>
          </div>
        }
      />
    );
  }

  return null;
};

const Banner = ({ icon, title, description, actions }) => (
  <div className="border-t border-surface-border bg-surface-raised px-4 py-4">
    <div className="mx-auto flex max-w-lg items-start gap-3">
      <div className="shrink-0 pt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  </div>
);
