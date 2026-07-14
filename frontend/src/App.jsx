import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout.jsx';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { GuestRoute } from './components/auth/GuestRoute.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ChatPage } from './pages/ChatPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

const App = () => (
  <Routes>
    <Route element={<GuestRoute />}>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:peerId" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default App;
