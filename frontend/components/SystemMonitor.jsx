"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, listCases } from "@/lib/api";

function StatusPill({ tone, label }) {
  const classes =
    tone === "ok"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
      : tone === "warn"
      ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
      : "border-rose-400/30 bg-rose-500/10 text-rose-300";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

export default function SystemMonitor() {
  const [status, setStatus] = useState({ state: "loading", message: "Checking API…" });
  const [latestCase, setLatestCase] = useState(null);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const started = Date.now();
        const data = await listCases(1);
        if (cancelled) return;

        const cases = Array.isArray(data?.cases) ? data.cases : [];
        setLatestCase(cases[0] || null);
        setStatus({
          state: "ok",
          message: `API reachable • ${Date.now() - started}ms`,
        });
        setLastCheckedAt(new Date().toISOString());
      } catch (error) {
        if (cancelled) return;
        setStatus({ state: "error", message: error?.message || "API unreachable" });
        setLastCheckedAt(new Date().toISOString());
      }
    };

    run();
    const interval = setInterval(run, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const latestSummary = useMemo(() => {
    if (!latestCase) return null;
    const breakdown = latestCase.breakdown || {};
    return {
      intakeId: latestCase.intake_id,
      classification: latestCase.classification,
      composite: typeof latestCase.composite_score === "number" ? latestCase.composite_score : null,
      azureRisk:
        typeof breakdown.azure_openai_risk === "number" ? breakdown.azure_openai_risk : null,
      safety:
        typeof breakdown.azure_safety_score === "number" ? breakdown.azure_safety_score : null,
    };
  }, [latestCase]);

  const pill =
    status.state === "ok"
      ? { tone: "ok", label: "Online" }
      : status.state === "loading"
      ? { tone: "warn", label: "Checking" }
      : { tone: "error", label: "Offline" };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">API status</p>
          <p className="mt-2 text-lg font-semibold text-white">{API_BASE_URL}</p>
          <p className="mt-1 text-sm text-slate-400">{status.message}</p>
          {lastCheckedAt && (
            <p className="mt-1 text-xs text-slate-500">
              Last checked: {new Date(lastCheckedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StatusPill tone={pill.tone} label={pill.label} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500">Latest case</p>
          {latestSummary ? (
            <div className="mt-3 space-y-1">
              <p className="font-mono text-xs text-emerald-200">{latestSummary.intakeId}</p>
              <p className="text-sm text-slate-200">{latestSummary.classification || "—"}</p>
              <p className="text-xs text-slate-400">
                Composite: {latestSummary.composite !== null ? (latestSummary.composite * 100).toFixed(1) + "%" : "—"}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No cases available yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500">Azure signals</p>
          {latestSummary ? (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-slate-400">
                OpenAI risk: {latestSummary.azureRisk !== null ? (latestSummary.azureRisk * 100).toFixed(1) + "%" : "—"}
              </p>
              <p className="text-xs text-slate-400">
                Content Safety: {latestSummary.safety !== null ? (latestSummary.safety * 100).toFixed(1) + "%" : "—"}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
