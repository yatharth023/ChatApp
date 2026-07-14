export const EmptyState = ({ title, description, action, icon }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-400">
    {icon && <div className="text-4xl text-slate-600">{icon}</div>}
    <h3 className="text-base font-semibold text-slate-200">{title}</h3>
    {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
    {action}
  </div>
);
