import { motion } from 'framer-motion';

export const LoadingScreen = () => (
  <div className="flex h-full w-full items-center justify-center bg-surface">
    <motion.div
      className="flex items-center gap-3 text-slate-300"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="h-3 w-3 animate-pulse rounded-full bg-brand-500" />
      <span className="text-sm">Loading…</span>
    </motion.div>
  </div>
);
