import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '../components/common/Avatar.jsx';
import { PresenceBadge } from '../components/common/PresenceBadge.jsx';
import { userService } from '../services/userService.js';
import { QUERY_KEYS } from '../utils/constants.js';
import { LoadingScreen } from '../components/common/LoadingScreen.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { data: user, isLoading } = useQuery({
    queryKey: QUERY_KEYS.PROFILE(userId),
    queryFn: () => userService.profile(userId),
    enabled: Boolean(userId),
  });

  if (isLoading || !user) return <LoadingScreen />;

  // Viewing your own profile? "Send message" would try to open a chat with
  // yourself, which the roomId helper (and the backend) both reject. Show
  // a link into settings instead so the CTA still leads somewhere useful.
  const isSelf = me?.id === user.id;

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <Avatar user={user} size="xl" isOnline={user.isOnline} />
        <h1 className="text-xl font-semibold text-slate-100">{user.username}</h1>
        <PresenceBadge isOnline={user.isOnline} lastSeenAt={user.lastSeenAt} />
        {user.bio && <p className="max-w-sm text-sm text-slate-400">{user.bio}</p>}
        {isSelf ? (
          <Link to="/settings" className="btn-primary mt-4">
            Edit profile
          </Link>
        ) : (
          <button className="btn-primary mt-4" onClick={() => navigate(`/chat/${user.id}`)}>
            Send message
          </button>
        )}
      </div>
    </div>
  );
};
