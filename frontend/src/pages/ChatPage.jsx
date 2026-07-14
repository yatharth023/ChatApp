import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineLockClosed } from 'react-icons/hi2';
import { useQuery } from '@tanstack/react-query';
import { ChatHeader } from '../components/chat/ChatHeader.jsx';
import { MessageList } from '../components/chat/MessageList.jsx';
import { MessageInput } from '../components/chat/MessageInput.jsx';
import { TypingIndicator } from '../components/chat/TypingIndicator.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { MessageSkeleton } from '../components/common/Skeleton.jsx';
import { FriendshipGate } from '../components/chat/FriendshipGate.jsx';
import { useConversation } from '../hooks/useConversation.js';
import { useChatStore } from '../store/chatStore.js';
import { useAuth } from '../context/AuthContext.jsx';
import { userService } from '../services/userService.js';
import { QUERY_KEYS, FRIEND_STATUS } from '../utils/constants.js';

// Stable reference — see useConversation.js for the rationale (React 19
// aborts the tree when a selector returns a fresh array each render).
const EMPTY_TYPING = Object.freeze([]);

export const ChatPage = () => {
  const { peerId } = useParams();
  const { user } = useAuth();
  const [replyTo, setReplyTo] = useState(null);

  const { data: peer } = useQuery({
    queryKey: QUERY_KEYS.PROFILE(peerId),
    queryFn: () => userService.profile(peerId),
    enabled: Boolean(peerId),
    staleTime: 60 * 1000,
  });

  const {
    roomId,
    messages,
    isLoadingInitial,
    isLoadingMore,
    hasMore,
    sendMessage,
    editMessage,
    deleteMessage,
    react,
    removeReaction,
    loadMore,
    markVisibleAsSeen,
  } = useConversation(peerId);

  const typingUserIds = useChatStore((s) =>
    roomId ? s.typingByRoom[roomId] ?? EMPTY_TYPING : EMPTY_TYPING,
  );
  const isPeerTyping = peer && typingUserIds.includes(peer.id);

  useEffect(() => {
    setReplyTo(null);
  }, [peerId]);

  const handleEdit = useCallback(
    async (message) => {
      const next = window.prompt('Edit message', message.plaintext ?? '');
      if (next == null) return;
      if (!next.trim()) return;
      try {
        await editMessage(message.id, next.trim());
      } catch {
        toast.error('Edit failed');
      }
    },
    [editMessage],
  );

  const handleDelete = useCallback(
    async (message) => {
      if (!window.confirm('Delete this message for everyone?')) return;
      try {
        await deleteMessage(message.id);
      } catch {
        toast.error('Delete failed');
      }
    },
    [deleteMessage],
  );

  if (!peerId) {
    return (
      <EmptyState
        icon={<HiOutlineLockClosed />}
        title="Select a conversation"
        description="Your messages are end-to-end encrypted."
      />
    );
  }
  if (peerId === user?.id) {
    return (
      <EmptyState
        icon={<HiOutlineLockClosed />}
        title="You can't message yourself"
        description="Pick a friend from the sidebar to start a conversation."
      />
    );
  }
  if (!peer) return <MessageSkeleton />;

  return (
    <div className="flex h-full flex-col">
      <ChatHeader peer={peer} />
      {/*
        The middle content must occupy all available vertical space so the
        composer stays pinned at the bottom of the pane. EmptyState /
        MessageSkeleton are naturally-sized, so we wrap them in a flex-1
        container. `min-h-0` is required for a flex child to be allowed to
        shrink when messages overflow — otherwise the pane grows and
        pushes the composer off-screen.
      */}
      <div className="flex min-h-0 flex-1 flex-col">
        {isLoadingInitial ? (
          <div className="flex flex-1 items-center justify-center">
            <MessageSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<HiOutlineLockClosed />}
              title={`Say hi to ${peer.username}`}
              description="Only the two of you can read what you send. Server never sees plaintext."
            />
          </div>
        ) : (
          <MessageList
            messages={messages}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
            onReply={setReplyTo}
            onReact={react}
            onRemoveReaction={removeReaction}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onVisibleMessagesChanged={markVisibleAsSeen}
          />
        )}
      </div>
      {peer.friendStatus === FRIEND_STATUS.ACCEPTED ? (
        <>
          <TypingIndicator isTyping={isPeerTyping} username={peer.username} />
          <MessageInput
            roomId={roomId}
            disabled={!user}
            onSend={sendMessage}
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
          />
        </>
      ) : (
        <FriendshipGate peer={peer} status={peer.friendStatus} />
      )}
    </div>
  );
};
