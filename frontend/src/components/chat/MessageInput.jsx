import { useEffect, useRef, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { HiOutlinePaperClip, HiOutlinePaperAirplane, HiOutlineFaceSmile, HiOutlineClock } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { ReplyPreview } from './ReplyPreview.jsx';
import { useTypingIndicator } from '../../hooks/useTypingIndicator.js';
import { uploadService } from '../../services/uploadService.js';
import { EXPIRY_OPTIONS } from '../../utils/constants.js';

const detectResourceType = (file) => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
};

/**
 * Closes a popover when the user clicks/taps anywhere outside every element
 * in `refs`. Registered on `mousedown` (rather than `click`) so we react
 * before any button inside the popover has a chance to fire — a subsequent
 * `click` on an outside element still runs normally.
 */
const useClickOutside = (refs, active, onOutside) => {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (event) => {
      const target = event.target;
      for (const ref of refs) {
        if (ref.current && ref.current.contains(target)) return;
      }
      onOutside();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [active, onOutside, refs]);
};

export const MessageInput = ({ roomId, disabled, onSend, replyTo, onClearReply }) => {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [expiresInSeconds, setExpiresInSeconds] = useState(null);
  const [expiryMenu, setExpiryMenu] = useState(false);
  const fileInputRef = useRef(null);
  const notifyTyping = useTypingIndicator(roomId);

  // Refs for the two popover pairs — the trigger button AND the popover
  // panel. Clicks that land inside either are considered "inside".
  const emojiButtonRef = useRef(null);
  const emojiPanelRef = useRef(null);
  const expiryButtonRef = useRef(null);
  const expiryPanelRef = useRef(null);

  useClickOutside([emojiButtonRef, emojiPanelRef], showEmoji, () => setShowEmoji(false));
  useClickOutside([expiryButtonRef, expiryPanelRef], expiryMenu, () => setExpiryMenu(false));

  // Also close both when the Escape key is pressed — a small ergonomic win
  // that costs nothing.
  useEffect(() => {
    if (!showEmoji && !expiryMenu) return undefined;
    const onEsc = (e) => {
      if (e.key !== 'Escape') return;
      setShowEmoji(false);
      setExpiryMenu(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [showEmoji, expiryMenu]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      await onSend({
        text: trimmed,
        media: null,
        replyToMessageId: replyTo?.id,
        expiresInSeconds,
      });
      onClearReply?.();
    } catch (err) {
      toast.error(err?.message ?? 'Failed to send');
      setText(trimmed);
    }
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadService.uploadToCloudinary(file);
      await onSend({
        text: text.trim(),
        media: { ...media, resourceType: detectResourceType(file) },
        replyToMessageId: replyTo?.id,
        expiresInSeconds,
      });
      setText('');
      onClearReply?.();
    } catch (err) {
      toast.error(err?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative border-t border-surface-border bg-surface-raised">
      <ReplyPreview message={replyTo} onClear={onClearReply} />

      {showEmoji && (
        <div ref={emojiPanelRef} className="absolute bottom-full left-4 z-20 mb-2">
          <EmojiPicker
            theme="dark"
            lazyLoadEmojis
            onEmojiClick={(e) => setText((t) => `${t}${e.emoji}`)}
          />
        </div>
      )}

      {expiryMenu && (
        <div
          ref={expiryPanelRef}
          className="absolute bottom-full right-4 z-20 mb-2 w-40 overflow-hidden rounded-lg border border-surface-border bg-slate-900 shadow-xl"
        >
          {EXPIRY_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                setExpiresInSeconds(opt.seconds);
                setExpiryMenu(false);
              }}
              className={clsx(
                'flex w-full items-center justify-between px-3 py-2 text-sm text-slate-200 hover:bg-slate-800',
                expiresInSeconds === opt.seconds && 'text-brand-300',
              )}
            >
              <span>{opt.label}</span>
              {expiresInSeconds === opt.seconds && <span className="text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 px-3 py-3"
      >
        <button
          ref={emojiButtonRef}
          type="button"
          className="btn-ghost"
          onClick={() => setShowEmoji((v) => !v)}
          aria-label="Emoji"
          title="Emoji"
        >
          <HiOutlineFaceSmile className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Attach"
          title="Attach media"
        >
          <HiOutlinePaperClip className={clsx('h-5 w-5', uploading && 'animate-pulse')} />
        </button>
        <button
          ref={expiryButtonRef}
          type="button"
          className={clsx('btn-ghost', expiresInSeconds && 'text-brand-300')}
          onClick={() => setExpiryMenu((v) => !v)}
          aria-label="Disappearing"
          title="Disappearing messages"
        >
          <HiOutlineClock className="h-5 w-5" />
        </button>
        <input ref={fileInputRef} type="file" hidden onChange={onPickFile} />

        <textarea
          rows={1}
          value={text}
          disabled={disabled}
          placeholder="Type a message"
          className="input max-h-32 flex-1 resize-none py-2"
          onChange={(e) => {
            setText(e.target.value);
            notifyTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />

        <button type="submit" className="btn-primary h-10 w-10 !p-0" disabled={disabled || uploading || !text.trim()}>
          <HiOutlinePaperAirplane className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
