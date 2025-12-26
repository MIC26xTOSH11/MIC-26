"use client";

import { useEffect, useState } from "react";
import CaseTable from "@/components/CaseTable";
import CaseDetail from "@/components/CaseDetail";
import Toast from "@/components/Toast";
import { fetchCase, listCases, createEventStream } from "@/lib/api";

export default function SubmissionsPage() {
  const [results, setResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState({ message: "", tone: "success" });
  const [filter, setFilter] = useState("all"); // all, malicious, suspicious, benign
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadCases = async () => {
      try {
        const data = await listCases(100);
        if (data.cases && data.cases.length > 0) {
          setResults(sortResults(data.cases));
        }
      } catch (error) {
        setToast({
          message: `Failed to load cases: ${error.message}`,
          tone: "error",
        });
      }
    };
    loadCases();

    // Subscribe to real-time updates
    const source = createEventStream(
      async (event) => {
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
          console.error("Failed to hydrate case", error);
        }
      },
      () => console.log("Event stream disconnected")
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

  const handleSelectCase = async (intakeId) => {
    if (!intakeId) return;
    setSelectedId(intakeId);
    try {
      const hydrated = await fetchCase(intakeId);
      upsertResult(hydrated);
    } catch (error) {
      setToast({
        message: `Unable to fetch case detail: ${error.message}`,
        tone: "error",
      });
    }
  };

  const filteredResults = results.filter((r) => {
    // Apply classification filter
    if (filter !== "all") {
      const classification = (r.classification || "").toLowerCase();
      if (!classification.includes(filter)) return false;
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesId = r.intake_id?.toLowerCase().includes(search);
      const matchesSource = r.source?.toLowerCase().includes(search);
      const matchesPlatform = r.platform?.toLowerCase().includes(search);
      const matchesRegion = r.region?.toLowerCase().includes(search);
      return matchesId || matchesSource || matchesPlatform || matchesRegion;
    }

    return true;
  });

  const selectedCase = results.find((r) => r.intake_id === selectedId);

  const stats = {
    total: results.length,
    malicious: results.filter((r) => (r.classification || "").toLowerCase().includes("malicious")).length,
    suspicious: results.filter((r) => (r.classification || "").toLowerCase().includes("suspicious")).length,
    benign: results.filter((r) => (r.classification || "").toLowerCase().includes("benign")).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Submissions & Cases</h1>
        <p className="mt-2 text-slate-400">
          View and manage all analyzed submissions
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Cases</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-3">
              <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Malicious</p>
              <p className="mt-1 text-2xl font-bold text-red-400">{stats.malicious}</p>
            </div>
            <div className="rounded-xl bg-red-500/10 p-3">
              <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Suspicious</p>
              <p className="mt-1 text-2xl font-bold text-yellow-400">{stats.suspicious}</p>
            </div>
            <div className="rounded-xl bg-yellow-500/10 p-3">
              <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Benign</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{stats.benign}</p>
            </div>
            <div className="rounded-xl bg-green-500/10 p-3">
              <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {["all", "malicious", "suspicious", "benign"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                filter === f
                  ? "bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10"
                  : "border border-white/10 bg-slate-900/50 text-slate-400 hover:bg-slate-900/70"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search cases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 sm:w-64"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cases List */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
          <CaseTable
            results={filteredResults}
            onSelect={handleSelectCase}
            selectedId={selectedId}
          />
        </div>

        {/* Case Detail */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
          {selectedCase ? (
            <CaseDetail caseData={selectedCase} />
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <svg className="mx-auto h-16 w-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-4 text-sm text-slate-500">Select a case to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast.message && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}
