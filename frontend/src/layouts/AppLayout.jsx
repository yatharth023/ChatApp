import { Outlet, useMatch } from 'react-router-dom';
import { Sidebar } from '../components/chat/Sidebar.jsx';
import { usePresenceSync } from '../hooks/usePresenceSync.js';

export const AppLayout = () => {
  usePresenceSync();
  const chatMatch = useMatch('/chat/:peerId');

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface">
      <aside
        className={`${
          chatMatch ? 'hidden md:flex' : 'flex'
        } h-full w-full max-w-sm shrink-0 flex-col border-r border-surface-border`}
      >
        <Sidebar />
      </aside>
      <main className={`${chatMatch ? 'flex' : 'hidden md:flex'} h-full flex-1 flex-col`}>
        <Outlet />
      </main>
    </div>
  );
};
