import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HiOutlineUserPlus, HiCheck, HiClock, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { Modal } from '../common/Modal.jsx';
import { Avatar } from '../common/Avatar.jsx';
import { userService } from '../../services/userService.js';
import { QUERY_KEYS, FRIEND_STATUS } from '../../utils/constants.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useFriends, useFriendshipMutations } from '../../hooks/useFriends.js';

/**
 * Search users → resolve friendship status against the local cache → let the
 * viewer either send a friend request, open the chat (if already friends),
 * cancel an outgoing request, or accept an incoming one. Opening a chat is
 * only surfaced after acceptance — this is the entry point for the entire
 * friend-request flow.
 */
export const NewChatDialog = ({ open, onClose }) => {
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 250);
  const navigate = useNavigate();
  const { friends, incoming, outgoing } = useFriends();
  const { sendRequest, accept, cancel } = useFriendshipMutations();

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: QUERY_KEYS.USER_SEARCH(debounced),
    queryFn: () => userService.search(debounced),
    enabled: open && debounced.trim().length > 0,
    staleTime: 15_000,
  });

  const users = data?.users ?? [];

  // Local status lookup so each row renders the correct CTA without an
  // extra per-user API call.
  const statusByUserId = useMemo(() => {
    const map = new Map();
    for (const f of friends) map.set(f.user.id, FRIEND_STATUS.ACCEPTED);
    for (const r of incoming) map.set(r.from.id, FRIEND_STATUS.PENDING_INCOMING);
    for (const r of outgoing) map.set(r.to.id, FRIEND_STATUS.PENDING_OUTGOING);
    return map;
  }, [friends, incoming, outgoing]);

  const openChat = (userId) => {
    onClose();
    navigate(`/chat/${userId}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Find people">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by username or email"
        className="input mb-4"
      />
      <div className="max-h-72 overflow-y-auto">
        {isFetching && <p className="px-2 py-3 text-sm text-slate-500">Searching…</p>}
        {!isFetching && debounced && users.length === 0 && (
          <p className="px-2 py-3 text-sm text-slate-500">
            No users match &ldquo;{debounced}&rdquo;
          </p>
        )}
        <ul className="space-y-1">
          {users.map((u) => {
            const status = statusByUserId.get(u.id) ?? FRIEND_STATUS.NONE;
            return (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-800/60"
              >
                <Avatar user={u} isOnline={u.isOnline} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">{u.username}</p>
                  {u.bio && <p className="truncate text-xs text-slate-500">{u.bio}</p>}
                </div>

                {status === FRIEND_STATUS.ACCEPTED && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => openChat(u.id)}
                    title="Open chat"
                  >
                    <HiOutlineChatBubbleLeftRight className="mr-1 h-4 w-4" />
                    Open
                  </button>
                )}

                {status === FRIEND_STATUS.NONE && (
                  <button
                    className="btn-primary text-xs"
                    onClick={() => sendRequest.mutate(u.id)}
                    disabled={sendRequest.isPending}
                    title="Send friend request"
                  >
                    <HiOutlineUserPlus className="mr-1 h-4 w-4" />
                    Add friend
                  </button>
                )}

                {status === FRIEND_STATUS.PENDING_OUTGOING && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => cancel.mutate(u.id)}
                    disabled={cancel.isPending}
                    title="Cancel request"
                  >
                    <HiClock className="mr-1 h-4 w-4" />
                    Requested
                  </button>
                )}

                {status === FRIEND_STATUS.PENDING_INCOMING && (
                  <button
                    className="btn-primary text-xs"
                    onClick={() => accept.mutate(u.id)}
                    disabled={accept.isPending}
                    title="Accept request"
                  >
                    <HiCheck className="mr-1 h-4 w-4" />
                    Accept
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
};
