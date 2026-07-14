import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export const AuthLayout = () => (
  <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900/40 p-4">
    <motion.div
      className="w-full max-w-md"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-6 flex items-center justify-center gap-3 text-slate-100">
        <div className="h-9 w-9 rounded-xl bg-brand-500 shadow-lg shadow-brand-500/40" />
        <h1 className="text-2xl font-bold tracking-tight">ChatApp</h1>
      </div>
      <div className="card p-8">
        <Outlet />
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">End-to-end encrypted. Zero-trust auth. Built for scale.</p>
    </motion.div>
  </div>
);
