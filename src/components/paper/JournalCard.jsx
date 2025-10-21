import { formatCurrency } from './utils';

export default function JournalCard({ entry, onEdit }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold text-slate-900">{entry.symbol}</p>
        <p className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{entry.side.toUpperCase()}</span>
        <span>·</span>
        <span>{entry.quantity} @ {formatCurrency(entry.price)}</span>
        {entry.tag ? (
          <>
            <span>·</span>
            <span>{entry.tag}</span>
          </>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-slate-600">{entry.note}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex gap-2">
          {entry.reaction ? <span>{entry.reaction}</span> : null}
        </div>
        <button type="button" onClick={() => onEdit(entry.id)} className="font-semibold text-blue-700">
          Edit note
        </button>
      </div>
    </div>
  );
}
