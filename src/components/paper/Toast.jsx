export default function Toast({ toast, onDismiss }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          <p className="mt-1 text-xs text-slate-500">{toast.message}</p>
          {toast.action ? (
            <button type="button" className="mt-2 text-xs font-semibold text-emerald-700" onClick={toast.action.onClick}>
              {toast.action.label}
            </button>
          ) : null}
        </div>
        <button type="button" className="text-xs text-slate-400" onClick={() => onDismiss(toast.id)}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
