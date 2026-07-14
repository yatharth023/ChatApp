import { useState } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { HiOutlineFaceSmile, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineArrowUturnLeft } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext.jsx';
import { useChatStore } from '../../store/chatStore.js';
import { formatMessageTime } from '../../utils/date.js';
import { MessageStatusIcon } from './MessageStatusIcon.jsx';
import { ReactionRow } from './ReactionRow.jsx';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MediaPreview = ({ url, type, thumbnail }) => {
  if (!url) return null;
  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="attachment" className="mt-1 max-h-72 rounded-xl object-cover" loading="lazy" />
      </a>
    );
  }
  if (type === 'video') {
    return (
      <video controls className="mt-1 max-h-72 rounded-xl" poster={thumbnail ?? undefined}>
        <source src={url} />
      </video>
    );
  }
  if (type === 'audio') {
    return <audio controls src={url} className="mt-1" />;
  }
  return (
    <a
      className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      📎 <span className="truncate">Attachment</span>
    </a>
  );
};

export const MessageBubble = ({
  message,
  isOwn,
  showAvatarSpacer,
  onReply,
  onReact,
  onRemoveReaction,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const [hover, setHover] = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  // Look the parent message up from the store so the reply preview shows the
  // actual referenced text, not just the string "Reply". If the parent is
  // outside the currently-loaded page of history, we render a placeholder.
  const parentMessage = useChatStore((s) => {
    if (!message.replyToMessageId) return null;
    const inRoom = s.messagesByRoom[message.roomId] ?? [];
    return inRoom.find((m) => m.id === message.replyToMessageId) ?? null;
  });

  const isDeleted = Boolean(message.deletedAt);

  const replyPreviewText = parentMessage
    ? parentMessage.deletedAt
      ? 'Message deleted'
      : parentMessage.plaintext ||
        (parentMessage.mediaType === 'image'
          ? '🖼 Image'
          : parentMessage.mediaType === 'video'
            ? '🎬 Video'
            : parentMessage.mediaUrl
              ? '📎 Attachment'
              : 'Message')
    : 'Message';

  const replyAuthorLabel = parentMessage
    ? parentMessage.senderId === user?.id
      ? 'You'
      : 'Them'
    : null;

  const handleToggleReaction = (emoji) => {
    const mine = message.reactions?.some((r) => r.userId === user?.id && r.emoji === emoji);
    if (mine) onRemoveReaction?.(message.id, emoji);
    else onReact?.(message.id, emoji);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={clsx('flex gap-2 px-3', isOwn ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setShowQuick(false);
      }}
    >
      <div className={clsx('flex max-w-[80%] flex-col', isOwn && 'items-end')}>
        <div
          className={clsx(
            'group relative rounded-2xl px-3 py-2 text-sm shadow-sm',
            isOwn ? 'bg-brand-600 text-white' : 'bg-surface-raised text-slate-100 border border-surface-border',
            isDeleted && 'italic opacity-70',
          )}
        >
          {message.replyToMessageId && (
            <div
              className={clsx(
                'mb-1 max-w-full rounded-md border-l-2 px-2 py-1 text-xs',
                isOwn
                  ? 'border-white/60 bg-white/10 text-white/80'
                  : 'border-brand-400 bg-slate-800 text-slate-300',
              )}
            >
              {replyAuthorLabel && (
                <p
                  className={clsx(
                    'text-[10px] font-semibold uppercase tracking-wide',
                    isOwn ? 'text-white/70' : 'text-brand-300',
                  )}
                >
                  {replyAuthorLabel}
                </p>
              )}
              <p className="truncate">{replyPreviewText}</p>
            </div>
          )}

          {isDeleted ? (
            <span>This message was deleted</span>
          ) : (
            <>
              {message.plaintext && <p className="whitespace-pre-wrap break-words">{message.plaintext}</p>}
              <MediaPreview url={message.mediaUrl} type={message.mediaType} thumbnail={message.thumbnail} />
            </>
          )}

          <div className={clsx('mt-1 flex items-center gap-1 text-[10px]', isOwn ? 'text-white/70' : 'text-slate-500')}>
            <span>{formatMessageTime(message.createdAt)}</span>
            {message.editedAt && !isDeleted && <span>· edited</span>}
            {isOwn && <MessageStatusIcon status={message.status} />}
          </div>

          {(hover || showQuick) && !isDeleted && (
            <div
              className={clsx(
                'absolute -top-8 flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/95 p-1 shadow-lg backdrop-blur',
                isOwn ? 'right-0' : 'left-0',
              )}
            >
              <button className="btn-ghost h-7 w-7 !p-0" title="React" onClick={() => setShowQuick((v) => !v)}>
                <HiOutlineFaceSmile />
              </button>
              <button className="btn-ghost h-7 w-7 !p-0" title="Reply" onClick={() => onReply?.(message)}>
                <HiOutlineArrowUturnLeft />
              </button>
              {isOwn && (
                <>
                  <button className="btn-ghost h-7 w-7 !p-0" title="Edit" onClick={() => onEdit?.(message)}>
                    <HiOutlinePencilSquare />
                  </button>
                  <button
                    className="btn-ghost h-7 w-7 !p-0 text-rose-400 hover:text-rose-300"
                    title="Delete"
                    onClick={() => onDelete?.(message)}
                  >
                    <HiOutlineTrash />
                  </button>
                </>
              )}
              {showQuick && (
                <div className="flex items-center gap-0.5 border-l border-slate-700 pl-1">
                  {QUICK_REACTIONS.map((e) => (
                    <button
                      key={e}
                      className="rounded p-1 text-base hover:bg-slate-800"
                      onClick={() => {
                        handleToggleReaction(e);
                        setShowQuick(false);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <ReactionRow reactions={message.reactions} onToggle={handleToggleReaction} />
      </div>
    </motion.div>
  );
};
