"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MetricCard from "@/components/MetricCard";
import IntakeForm from "@/components/IntakeForm";
import EventsFeed from "@/components/EventsFeed";
import Toast from "@/components/Toast";
import ThemeToggle from "@/components/ThemeToggle";
import WorldHeatmapLeaflet from "@/components/WorldHeatmapLeaflet";
import {
  submitIntake,
  fetchCase,
  createEventStream,
  listCases,
  API_BASE_URL,
} from "@/lib/api";

export default function HomePage() {
  const [results, setResults] = useState([]);
  const [events, setEvents] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", tone: "success" });
  const [showLatestResult, setShowLatestResult] = useState(false);
  const [latestSubmissionId, setLatestSubmissionId] = useState(null);

  // Load existing cases on mount
  useEffect(() => {
    const loadExistingCases = async () => {
      try {
        const data = await listCases(20);
        if (data.cases && data.cases.length > 0) {
          setResults(sortResults(data.cases));
        }
      } catch (error) {
        console.error("[TattvaDrishti] Failed to load cases:", error);
      }
    };
    loadExistingCases();
  }, []);

  useEffect(() => {
    const timer = toast.message
      ? setTimeout(() => setToast({ message: "", tone: "success" }), 4200)
      : null;
    return () => timer && clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const source = createEventStream(
      async (event) => {
        setEvents((prev) => [event, ...prev].slice(0, 20));
        upsertResult({
          intake_id: event.intake_id,
          submitted_at: event.submitted_at,
          classification: event.classification,
          composite_score: event.score,
        });
        try {
          const hydrated = await fetchCase(event.intake_id);
          upsertResult(hydrated);
        } catch (error) {
          console.error("Failed to hydrate case via events stream", error);
        }
      },
      () => {
        setToast({
          message: "Event stream interrupted. Retrying…",
          tone: "error",
        });
      }
    );

    return () => source.close();
  }, []);

  const upsertResult = (result) => {
    if (!result || !result.intake_id) return;
    setResults((previous) => {
      const existingIndex = previous.findIndex(
        (item) => item.intake_id === result.intake_id
      );
      if (existingIndex >= 0) {
        const updated = [...previous];
        updated[existingIndex] = { ...updated[existingIndex], ...result };
        return sortResults(updated);
      }
      return sortResults([result, ...previous]);
    });
  };

  const sortResults = (data) =>
    [...data].sort((a, b) => {
      const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return dateB - dateA;
    });

  const handleSubmitIntake = async (payload) => {
    try {
      setIsSubmitting(true);
      const result = await submitIntake(payload);
      upsertResult(result);
      setLatestSubmissionId(result.intake_id);
      setShowLatestResult(true);
      setToast({ message: "Narrative analysed successfully.", tone: "success" });
      // Scroll to results section smoothly
      setTimeout(() => {
        const resultsSection = document.getElementById('latest-result');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return true;
    } catch (error) {
      setToast({
        message: `Unable to analyse narrative: ${error.message}`,
        tone: "error",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const metrics = useMemo(() => {
    const total = results.length;
    const malicious = results.filter((r) =>
      (r.classification || "").toLowerCase().includes("malicious")
    ).length;
    const suspicious = results.filter((r) =>
      (r.classification || "").toLowerCase().includes("suspicious")
    ).length;
    const benign = results.filter((r) =>
      (r.classification || "").toLowerCase().includes("benign")
    ).length;
    const average =
      total === 0
        ? 0
        : Math.round(
            (results.reduce((acc, r) => acc + (r.composite_score || 0), 0) /
              total) *
              100
          );
    const lastUpdated = results[0]?.submitted_at
      ? new Date(results[0].submitted_at).toLocaleString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          day: "2-digit",
          month: "short",
        })
      : "—";
    return { total, malicious, suspicious, benign, average, lastUpdated };
  }, [results]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-emerald-500/5 via-slate-900 to-slate-950 px-6 py-12 md:px-8">
        {/* Background Glows */}
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -right-44 bottom-[-6rem] h-96 w-96 rounded-full bg-cyan-500/10 blur-[160px]" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <ThemeToggle />
            <Link
              href="/simple"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300"
            >
              Guided Mode
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              TattvaDrishti Shield
            </span>
            <h1 className="mt-4 text-4xl font-bold text-white md:text-5xl">
              AI-Powered Malign Influence{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Detection
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-400">
              Real-time narrative analysis, threat intelligence, and federated blockchain ledger
              for comprehensive disinformation detection.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm">
              <p className="text-sm text-slate-400">Total Analyses</p>
              <p className="mt-1 text-3xl font-bold text-white">{metrics.total}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm">
              <p className="text-sm text-slate-400">Malicious</p>
              <p className="mt-1 text-3xl font-bold text-red-400">{metrics.malicious}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm">
              <p className="text-sm text-slate-400">Suspicious</p>
              <p className="mt-1 text-3xl font-bold text-yellow-400">{metrics.suspicious}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm">
              <p className="text-sm text-slate-400">Benign</p>
              <p className="mt-1 text-3xl font-bold text-green-400">{metrics.benign}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm">
              <p className="text-sm text-slate-400">Avg Score</p>
              <p className="mt-1 text-3xl font-bold text-emerald-400">{metrics.average}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-8">
        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/upload"
            className="group rounded-2xl border border-white/10 bg-slate-900/50 p-6 transition-all hover:border-emerald-400/50 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-emerald-500/10 p-3 transition-all group-hover:bg-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Upload Content</h3>
                <p className="text-xs text-slate-500">Drag & drop files</p>
              </div>
            </div>
          </Link>

          <Link
            href="/submissions"
            className="group rounded-2xl border border-white/10 bg-slate-900/50 p-6 transition-all hover:border-blue-400/50 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-500/10 p-3 transition-all group-hover:bg-blue-500/20">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">View Cases</h3>
                <p className="text-xs text-slate-500">Browse submissions</p>
              </div>
            </div>
          </Link>

          <Link
            href="/analytics"
            className="group rounded-2xl border border-white/10 bg-slate-900/50 p-6 transition-all hover:border-purple-400/50 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-purple-500/10 p-3 transition-all group-hover:bg-purple-500/20">
                <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Analytics</h3>
                <p className="text-xs text-slate-500">View insights</p>
              </div>
            </div>
          </Link>

         
        </div>

        {/* Latest Analysis Result */}
        {showLatestResult && results.length > 0 && results[0] && results[0].intake_id === latestSubmissionId && (
          <div id="latest-result" className="mb-8 animate-fadeIn rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 animate-pulse">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Analysis Complete!</h2>
                    <p className="mt-1 text-sm text-slate-400">Your narrative has been analyzed</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowLatestResult(false)}
                className="text-sm text-slate-400 hover:text-slate-300 transition"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Key Metrics */}
              <div className="space-y-4">
                {/* Classification Badge */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6">
                  <p className="text-sm font-medium text-slate-400">Classification</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-lg font-bold ${
                        (results[0].classification || "").toLowerCase().includes("malicious")
                          ? "bg-red-500/20 text-red-400"
                          : (results[0].classification || "").toLowerCase().includes("suspicious")
                          ? "bg-yellow-500/20 text-yellow-400"
                          : (results[0].classification || "").toLowerCase().includes("benign")
                          ? "bg-green-500/20 text-green-400"
                          : "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {(results[0].classification || "").toLowerCase().includes("malicious") && (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {(results[0].classification || "").toLowerCase().includes("suspicious") && (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                      {(results[0].classification || "").toLowerCase().includes("benign") && (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {results[0].classification || "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Composite Score */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6">
                  <p className="text-sm font-medium text-slate-400">Composite Threat Score</p>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-5xl font-bold text-white">
                      {typeof results[0].composite_score === "number"
                        ? (results[0].composite_score * 100).toFixed(1)
                        : "—"}
                    </span>
                    <span className="mb-2 text-2xl text-slate-500">%</span>
                  </div>
                  {/* Progress Bar */}
                  {typeof results[0].composite_score === "number" && (
                    <div className="mt-4">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            results[0].composite_score >= 0.7
                              ? "bg-gradient-to-r from-red-500 to-red-400"
                              : results[0].composite_score >= 0.4
                              ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                              : "bg-gradient-to-r from-green-500 to-green-400"
                          }`}
                          style={{ width: `${results[0].composite_score * 100}%` }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-slate-500">
                        <span>Low Risk</span>
                        <span>High Risk</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Risk Level Indicator */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6">
                  <p className="text-sm font-medium text-slate-400">Risk Assessment</p>
                  <div className="mt-3 space-y-2">
                    {typeof results[0].composite_score === "number" && (
                      <>
                        {results[0].composite_score >= 0.7 ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
                              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </span>
                            <span className="text-lg font-semibold text-red-400">High Risk Detected</span>
                          </div>
                        ) : results[0].composite_score >= 0.4 ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/20">
                              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                            <span className="text-lg font-semibold text-yellow-400">Moderate Risk</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
                              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                            <span className="text-lg font-semibold text-green-400">Low Risk</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Details */}
              <div className="space-y-4">
                {/* Metadata */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">Analysis Details</h3>
                  {(() => {
                    const breakdown = results[0]?.breakdown || {};
                    const detectedName = breakdown.detected_language_name;
                    const detectedCode = breakdown.detected_language;
                    const detectedConfidence = breakdown.language_confidence;

                    return (
                      <>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b border-white/5 pb-3">
                      <span className="text-sm text-slate-500">Intake ID</span>
                      <span className="max-w-xs truncate font-mono text-sm text-slate-300">
                        {results[0].intake_id || "—"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between border-b border-white/5 pb-3">
                      <span className="text-sm text-slate-500">Analyzed At</span>
                      <span className="text-sm text-slate-300">
                        {results[0].submitted_at
                          ? new Date(results[0].submitted_at).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                    {results[0].platform && (
                      <div className="flex items-start justify-between border-b border-white/5 pb-3">
                        <span className="text-sm text-slate-500">Platform</span>
                        <span className="text-sm text-slate-300">{results[0].platform}</span>
                      </div>
                    )}
                    {results[0].source && (
                      <div className="flex items-start justify-between border-b border-white/5 pb-3">
                        <span className="text-sm text-slate-500">Source</span>
                        <span className="max-w-xs truncate text-sm text-slate-300">{results[0].source}</span>
                      </div>
                    )}
                    {results[0].region && (
                      <div className="flex items-start justify-between border-b border-white/5 pb-3">
                        <span className="text-sm text-slate-500">Region</span>
                        <span className="text-sm text-slate-300">{results[0].region}</span>
                      </div>
                    )}
                    {(detectedName || detectedCode) && (
                      <div className="flex items-start justify-between border-b border-white/5 pb-3">
                        <span className="text-sm text-slate-500">Detected language</span>
                        <span className="text-sm text-slate-300">
                          {detectedName || detectedCode}
                          {detectedCode ? ` (${detectedCode})` : ""}
                          {typeof detectedConfidence === "number"
                            ? ` • ${(detectedConfidence * 100).toFixed(0)}%`
                            : ""}
                        </span>
                      </div>
                    )}
                    {breakdown?.model_family && (
                      <div className="flex items-start justify-between">
                        <span className="text-sm text-slate-500">Model Family</span>
                        <span className="text-sm text-slate-300">
                          {breakdown.model_family}
                          {typeof breakdown.model_family_confidence === "number"
                            ? ` • ${(breakdown.model_family_confidence * 100).toFixed(0)}%`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>

                      </>
                    );
                  })()}
                </div>

                {/* Detection Scores */}
                {(() => {
                  const breakdown = results[0]?.breakdown || null;
                  if (!breakdown) return null;

                  const rows = [
                    {
                      label: "Azure OpenAI semantic risk",
                      value:
                        typeof breakdown.azure_openai_risk === "number"
                          ? `${(breakdown.azure_openai_risk * 100).toFixed(1)}%`
                          : null,
                    },
                    {
                      label: "Azure Content Safety",
                      value:
                        typeof breakdown.azure_safety_score === "number"
                          ? `${(breakdown.azure_safety_score * 100).toFixed(1)}%`
                          : null,
                    },
                    {
                      label: "AI-generated probability",
                      value:
                        typeof breakdown.ai_probability === "number"
                          ? `${(breakdown.ai_probability * 100).toFixed(1)}%`
                          : null,
                    },
                    {
                      label: "Behavioral risk",
                      value:
                        typeof breakdown.behavioral_score === "number"
                          ? `${(breakdown.behavioral_score * 100).toFixed(1)}%`
                          : null,
                    },
                    {
                      label: "Linguistic signal",
                      value:
                        typeof breakdown.linguistic_score === "number"
                          ? `${(breakdown.linguistic_score * 100).toFixed(1)}%`
                          : null,
                    },
                  ].filter((row) => row.value !== null);

                  const flagged = Array.isArray(breakdown.azure_safety_result?.flagged_categories)
                    ? breakdown.azure_safety_result.flagged_categories
                    : [];

                  if (rows.length === 0 && flagged.length === 0 && !breakdown.azure_openai_reasoning) {
                    return null;
                  }

                  return (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6">
                    <h3 className="mb-4 text-lg font-semibold text-white">Detection Scores</h3>
                    <div className="space-y-3">
                      {rows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">{row.label}</span>
                          <span className="text-sm font-medium text-white">{row.value}</span>
                        </div>
                      ))}

                      {breakdown.azure_openai_reasoning && (
                        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
                          <p className="text-xs uppercase tracking-wider text-slate-500">
                            Azure OpenAI rationale
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {breakdown.azure_openai_reasoning}
                          </p>
                        </div>
                      )}

                      {flagged.length > 0 && (
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                          <p className="text-xs uppercase tracking-wider text-rose-300">
                            Content Safety flags
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {flagged.map((cat) => (
                              <span
                                key={cat}
                                className="rounded bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Link
                    href="/submissions"
                    className="flex-1 rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20"
                  >
                    View All Cases
                  </Link>
                  <Link
                    href="/analytics"
                    className="flex-1 rounded-xl bg-purple-500/10 px-4 py-3 text-center text-sm font-medium text-purple-400 transition hover:bg-purple-500/20"
                  >
                    View Analytics
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Quick Submit */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
            <h2 className="mb-4 text-xl font-semibold text-white">Quick Analysis</h2>
            <IntakeForm
              onSubmit={handleSubmitIntake}
              isSubmitting={isSubmitting}
              onValidationError={(message) =>
                setToast({ message, tone: "error" })
              }
            />
          </div>

          {/* Recent Events */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
            <h2 className="mb-4 text-xl font-semibold text-white">Live Activity</h2>
            <EventsFeed events={events} />
          </div>
        </div>

        {/* World Heatmap */}
        <div className="mt-8">
          <WorldHeatmapLeaflet />
        </div>

        {/* API Info */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h3 className="mb-3 text-lg font-semibold text-white">API Endpoints</h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Base URL:</span>
              <code className="rounded bg-slate-800 px-2 py-1 font-mono text-xs text-emerald-400">
                {API_BASE_URL}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Status:</span>
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400"></span>
                Connected
              </span>
            </div>
          </div>
        </div>
      </div>

      {toast.message && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}
