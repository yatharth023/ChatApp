import { Fragment, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { DayDivider } from './DayDivider.jsx';
import { MessageBubble } from './MessageBubble.jsx';
import { isNewDay } from '../../utils/date.js';

const NEAR_TOP_PX = 120;

export const MessageList = ({
  messages,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onReply,
  onReact,
  onRemoveReaction,
  onEdit,
  onDelete,
  onVisibleMessagesChanged,
}) => {
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const previousScrollHeightRef = useRef(0);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    if (stickToBottomRef.current) {
      node.scrollTop = node.scrollHeight;
    } else if (previousScrollHeightRef.current) {
      node.scrollTop = node.scrollHeight - previousScrollHeightRef.current;
    }
    previousScrollHeightRef.current = node.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;

    if (node.scrollTop < NEAR_TOP_PX && hasMore && !isLoadingMore) {
      previousScrollHeightRef.current = node.scrollHeight;
      onLoadMore?.();
    }
  };

  useEffect(() => {
    if (!onVisibleMessagesChanged || messages.length === 0) return;
    const unread = messages
      .filter((m) => m.receiverId === user?.id && m.status !== 'READ' && !m.deletedAt)
      .map((m) => m.id);
    if (unread.length > 0) onVisibleMessagesChanged(unread);
  }, [messages, user?.id, onVisibleMessagesChanged]);

  const rows = useMemo(() => {
    return messages.map((m, idx) => {
      const prev = idx > 0 ? messages[idx - 1] : null;
      const showDay = isNewDay(prev, m);
      return { message: m, showDay };
    });
  }, [messages]);

  return (
    <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 space-y-1 overflow-y-auto py-3">
      {isLoadingMore && (
        <p className="mx-auto w-fit rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">Loading older…</p>
      )}
      {rows.map(({ message, showDay }) => (
        <Fragment key={message.id}>
          {showDay && <DayDivider date={message.createdAt} />}
          <MessageBubble
            message={message}
            isOwn={message.senderId === user?.id}
            onReply={onReply}
            onReact={onReact}
            onRemoveReaction={onRemoveReaction}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Fragment>
      ))}
      <div ref={bottomAnchorRef} />
    </div>
  );
};
