import { HiCheck } from 'react-icons/hi2';
import { HiOutlineClock } from 'react-icons/hi';
import { MESSAGE_STATUS } from '../../utils/constants.js';

const CheckPair = ({ read }) => (
  <span className={`inline-flex ${read ? 'text-brand-300' : 'text-slate-400'}`}>
    <HiCheck className="-mr-1.5 h-3.5 w-3.5" />
    <HiCheck className="h-3.5 w-3.5" />
  </span>
);

export const MessageStatusIcon = ({ status }) => {
  switch (status) {
    case MESSAGE_STATUS.PENDING:
      return <HiOutlineClock className="h-3.5 w-3.5 text-slate-500" title="Sending…" />;
    case MESSAGE_STATUS.FAILED:
      return <span className="text-xs text-rose-400" title="Failed">!</span>;
    case MESSAGE_STATUS.SENT:
      return <HiCheck className="h-3.5 w-3.5 text-slate-400" title="Sent" />;
    case MESSAGE_STATUS.DELIVERED:
      return <CheckPair />;
    case MESSAGE_STATUS.READ:
      return <CheckPair read />;
    default:
      return null;
  }
};
