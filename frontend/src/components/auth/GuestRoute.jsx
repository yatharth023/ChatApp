import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { LoadingScreen } from '../common/LoadingScreen.jsx';

export const GuestRoute = () => {
  const { isAuthed, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isAuthed) return <Navigate to="/chat" replace />;
  return <Outlet />;
};
