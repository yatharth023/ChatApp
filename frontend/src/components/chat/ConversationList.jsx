import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { useConversations } from '../../hooks/useConversations.js';
import { useFriends } from '../../hooks/useFriends.js';
import { useChatStore } from '../../store/chatStore.js';
import { Avatar } from '../common/Avatar.jsx';
import { ConversationSkeleton } from '../common/Skeleton.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { formatDayLabel } from '../../utils/date.js';

/**
 * Sidebar row for a single friend. Last message + unread count come from the
 * `/messages/conversations` feed when available; friends who haven't
 * exchanged anything yet still render with a placeholder tagline so their
 * name is visible in the sidebar.
 */
/**
 * Given a raw last-message from the conversation feed (already decrypted
 * by `useConversations`), pick the string we render in the sidebar.
 * Media and deleted messages get badges since they have no plaintext.
 */
const buildPreview = (lastMessage, plaintext) => {
  if (!lastMessage) return 'Say hi 👋';
  if (lastMessage.deletedAt) return 'Message deleted';
  if (plaintext && plaintext.trim()) return plaintext;
  if (lastMessage.mediaType === 'image') return '🖼 Photo';
  if (lastMessage.mediaType === 'video') return '🎬 Video';
  if (lastMessage.mediaType === 'audio') return '🎤 Audio';
  if (lastMessage.mediaUrl) return '📎 Attachment';
  return '🔒 Encrypted';
};

/**
 * "N new messages" label capped at "4+ new messages" for anything ≥ 5.
 * A single unread message shows just the blue dot (no text) so it doesn't
 * feel like spam.
 */
const buildUnreadLabel = (unread) => {
  if (unread < 2) return null;
  if (unread >= 5) return '4+ new messages';
  return `${unread} new messages`;
};

const Row = ({ friend, conversation }) => {
  const presence = useChatStore((s) => s.presence[friend.user.id]);
  const activePeerId = useChatStore((s) => s.activePeerId);
  const isOnline = presence?.isOnline ?? friend.user.isOnline ?? false;
  const lastMessage = conversation?.lastMessage;
  // When this friend's chat is on screen, force unread to zero — the client
  // has already emitted `message_seen` and there's no point flashing a stale
  // count from a cached conversations query before it refreshes.
  const isViewing = activePeerId === friend.user.id;
  const unread = isViewing ? 0 : conversation?.unreadCount ?? 0;
  const preview = buildPreview(lastMessage, conversation?.lastMessagePlaintext);
  const unreadLabel = buildUnreadLabel(unread);
  const hasUnread = unread > 0;

  return (
    <NavLink
      to={`/chat/${friend.user.id}`}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 border-b border-surface-border/40 px-3 py-3 transition',
          isActive ? 'bg-brand-500/10' : 'hover:bg-slate-800/60',
        )
      }
    >
      <Avatar user={friend.user} isOnline={isOnline} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={clsx(
              'truncate text-sm',
              hasUnread ? 'font-bold text-white' : 'font-semibold text-slate-100',
            )}
          >
            {friend.user.username}
          </p>
          {lastMessage?.createdAt && (
            <span className={clsx('text-[11px]', hasUnread ? 'text-brand-300' : 'text-slate-500')}>
              {formatDayLabel(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={clsx(
              'truncate text-xs',
              hasUnread ? 'font-medium text-slate-200' : 'text-slate-400',
            )}
          >
            {preview}
          </p>
          {hasUnread && (
            <div className="flex shrink-0 items-center gap-1.5">
              {unreadLabel && (
                <span className="whitespace-nowrap text-[10px] font-semibold text-brand-300">
                  {unreadLabel}
                </span>
              )}
              <span
                className="h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                aria-label="Unread"
              />
            </div>
          )}
        </div>
      </div>
    </NavLink>
  );
};

export const ConversationList = () => {
  const { data: conversations, isLoading: convLoading } = useConversations();
  const { friends, isLoading: friendsLoading } = useFriends();

  const conversationByPeer = useMemo(() => {
    const map = new Map();
    for (const c of conversations ?? []) map.set(c.peerId, c);
    return map;
  }, [conversations]);

  const orderedFriends = useMemo(
    () =>
      [...friends].sort((a, b) => {
        const ca = conversationByPeer.get(a.user.id);
        const cb = conversationByPeer.get(b.user.id);
        const ta = ca?.lastMessage?.createdAt ?? a.since;
        const tb = cb?.lastMessage?.createdAt ?? b.since;
        return new Date(tb) - new Date(ta);
      }),
    [friends, conversationByPeer],
  );

  const isLoading = convLoading || friendsLoading;

  if (isLoading) {
    return (
      <div>
        {Array.from({ length: 6 }).map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (orderedFriends.length === 0) {
    return (
      <EmptyState
        icon={<HiOutlineChatBubbleLeftRight />}
        title="No friends yet"
        description="Use the + button to search for someone and send them a friend request."
      />
    );
  }

  return (
    <div>
      <h3 className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Friends
      </h3>
      <div className="mt-1">
        {orderedFriends.map((friend) => (
          <Row
            key={friend.friendshipId}
            friend={friend}
            conversation={conversationByPeer.get(friend.user.id)}
          />
        ))}
      </div>
    </div>
  );
};
