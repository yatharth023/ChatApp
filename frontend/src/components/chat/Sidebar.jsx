import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineCog6Tooth, HiOutlineArrowRightOnRectangle, HiOutlinePlus } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { Avatar } from '../common/Avatar.jsx';
import { ConversationList } from './ConversationList.jsx';
import { FriendRequestList } from './FriendRequestList.jsx';
import { NewChatDialog } from './NewChatDialog.jsx';
import { useFriends } from '../../hooks/useFriends.js';

const socketStatusColor = {
  connected: 'bg-emerald-400',
  reconnecting: 'bg-amber-400 animate-pulse',
  disconnected: 'bg-rose-400',
  idle: 'bg-slate-500',
};

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { status } = useSocket();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const { incoming } = useFriends();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <Link to={`/profile/${user?.id}`} className="flex items-center gap-3">
          <Avatar user={user} />
          <div>
            <p className="text-sm font-semibold text-slate-100">{user?.username}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`h-2 w-2 rounded-full ${socketStatusColor[status]}`} />
              <span className="capitalize">{status}</span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setNewChatOpen(true)}
            className="btn-ghost"
            aria-label="New conversation"
            title="Start a new chat"
          >
            <HiOutlinePlus className="h-5 w-5" />
          </button>
          <Link to="/settings" className="btn-ghost" aria-label="Settings" title="Settings">
            <HiOutlineCog6Tooth className="h-5 w-5" />
          </Link>
          <button type="button" onClick={logout} className="btn-ghost" aria-label="Log out" title="Log out">
            <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <FriendRequestList incoming={incoming} />
        <ConversationList />
      </div>

      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} />
    </div>
  );
};
