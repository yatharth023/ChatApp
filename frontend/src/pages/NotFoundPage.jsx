import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface text-slate-300">
    <p className="text-6xl font-bold text-slate-500">404</p>
    <p>That route doesn&rsquo;t exist.</p>
    <Link className="btn-primary" to="/chat">Back to chat</Link>
  </div>
);
