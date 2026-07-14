import { useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineNoSymbol } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '../common/Avatar.jsx';
import { useChatStore } from '../../store/chatStore.js';
import { blockService } from '../../services/blockService.js';
import { QUERY_KEYS } from '../../utils/constants.js';

export const ChatHeader = ({ peer }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const presence = useChatStore((s) => s.presence[peer?.id]);
  // Presence is still communicated through the avatar's dot; the second
  // line under the username is reserved for the peer's bio.
  const isOnline = presence?.isOnline ?? peer?.isOnline ?? false;
  const bio = peer?.bio?.trim();

  const blockMutation = useMutation({
    mutationFn: () => blockService.block(peer.id),
    onSuccess: () => {
      toast.success(`Blocked ${peer.username}`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BLOCKED });
    },
    onError: () => toast.error('Failed to block user'),
  });

  return (
    <header className="flex items-center gap-3 border-b border-surface-border bg-surface-raised px-4 py-3">
      <button className="btn-ghost md:hidden" onClick={() => navigate('/chat')} aria-label="Back">
        <HiOutlineArrowLeft />
      </button>
      <Avatar user={peer} isOnline={isOnline} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{peer?.username}</p>
        {bio && <p className="truncate text-xs text-slate-400">{bio}</p>}
      </div>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => {
          if (!confirm(`Block ${peer.username}? You won't send or receive messages.`)) return;
          blockMutation.mutate();
        }}
        aria-label="Block user"
        title="Block user"
      >
        <HiOutlineNoSymbol />
      </button>
    </header>
  );
};
