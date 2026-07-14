import { AnimatePresence, motion } from 'framer-motion';

export const TypingIndicator = ({ isTyping, username }) => (
  <AnimatePresence>
    {isTyping && (
      <motion.div
        key="typing"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        className="mx-3 mb-1 inline-flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5 text-xs text-slate-300"
      >
        <span className="flex items-center gap-0.5">
          <span className="h-1.5 w-1.5 animate-typing rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 animate-typing rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 animate-typing rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
        </span>
        <span>{username ? `${username} is typing…` : 'typing…'}</span>
      </motion.div>
    )}
  </AnimatePresence>
);
