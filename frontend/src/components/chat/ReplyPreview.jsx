import { HiOutlineXMark } from 'react-icons/hi2';

export const ReplyPreview = ({ message, onClear }) => {
  if (!message) return null;
  return (
    <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border-l-2 border-brand-500 bg-surface-raised px-3 py-2 text-xs text-slate-300">
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 font-semibold text-brand-300">Replying to a message</p>
        <p className="truncate">{message.plaintext || '📎 Media'}</p>
      </div>
      <button className="btn-ghost h-6 w-6 !p-0" onClick={onClear} aria-label="Cancel reply">
        <HiOutlineXMark />
      </button>
    </div>
  );
};
