export default function EventsFeed({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <svg className="mx-auto h-12 w-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-sm">No activity yet</p>
        <p className="text-xs mt-1 opacity-75">Events will appear here as content is submitted</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {events.map((event, idx) => {
        const classColor = 
          event.classification === "malicious" ? "text-rose-400" :
          event.classification === "suspicious" ? "text-amber-400" :
          "text-emerald-400";
        
        const bgColor = 
          event.classification === "malicious" ? "bg-rose-500/10 border-rose-500/20" :
          event.classification === "suspicious" ? "bg-amber-500/10 border-amber-500/20" :
          "bg-emerald-500/10 border-emerald-500/20";

        return (
          <div 
            key={event.intake_id || idx} 
            className={`rounded-xl border p-3 ${bgColor} hover:bg-opacity-20 transition-all`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-semibold ${classColor}`}>
                    {event.classification?.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">
                    Score: {event.score?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate">
                  ID: {event.intake_id}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">
                  {new Date(event.submitted_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

