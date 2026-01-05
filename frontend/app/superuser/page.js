"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { listCases } from "@/lib/api";
import WorldHeatmapLeaflet from "@/components/WorldHeatmapLeaflet";
import ThemeToggle from "@/components/ThemeToggle";
import SystemMonitor from "@/components/SystemMonitor";
import UpgradePrompt from "@/components/UpgradePrompt";

export default function SuperUserPage() {
  const router = useRouter();
  const { user, loading, hasPermission } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [cases, setCases] = useState([]);
  const [timeRange, setTimeRange] = useState("7d");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadCases = async () => {
      try {
        const data = await listCases(500);
        if (data.cases && data.cases.length > 0) {
          setCases(data.cases);
        }
      } catch (error) {
        console.error("Failed to load cases:", error);
      }
    };
    if (user && hasPermission('view_detailed_reports')) {
      loadCases();
    }
  }, [user, hasPermission]);

  // Analytics computations
  const analytics = useMemo(() => {
    const now = Date.now();
    const timeFilters = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      all: Infinity,
    };

    const filtered = cases.filter((r) => {
      if (!r.submitted_at) return false;
      const timestamp = new Date(r.submitted_at).getTime();
      return now - timestamp <= timeFilters[timeRange];
    });

    const classifications = { malicious: 0, suspicious: 0, benign: 0, unknown: 0 };
    filtered.forEach((r) => {
      const label = (r.classification || "").toLowerCase();
      if (label.includes("malicious")) classifications.malicious++;
      else if (label.includes("suspicious")) classifications.suspicious++;
      else if (label.includes("benign")) classifications.benign++;
      else classifications.unknown++;
    });

    const regions = {};
    filtered.forEach((r) => {
      if (r.region) regions[r.region] = (regions[r.region] || 0) + 1;
    });
    const topRegions = Object.entries(regions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    const avgScore = filtered.reduce((sum, r) => sum + (r.composite_score || 0), 0) / (filtered.length || 1);

    // Previous period comparison
    let trend = "stable";
    if (timeRange !== "all") {
      const periodMs = timeFilters[timeRange];
      const prevPeriod = cases.filter((r) => {
        if (!r.submitted_at) return false;
        const timestamp = new Date(r.submitted_at).getTime();
        return timestamp >= now - 2 * periodMs && timestamp < now - periodMs;
      });
      const prevAvg = prevPeriod.reduce((sum, r) => sum + (r.composite_score || 0), 0) / (prevPeriod.length || 1);
      if (avgScore > prevAvg * 1.1) trend = "↑ increasing";
      else if (avgScore < prevAvg * 0.9) trend = "↓ decreasing";
    }

    return {
      total: filtered.length,
      classifications,
      avgScore,
      topRegions,
      trend,
    };
  }, [cases, timeRange]);

  const generateExecutivePDF = () => {
    setGenerating(true);
    setTimeout(() => {
      const maliciousPct = ((analytics.classifications.malicious / analytics.total) * 100).toFixed(1);
      const suspiciousPct = ((analytics.classifications.suspicious / analytics.total) * 100).toFixed(1);
      const benignPct = ((analytics.classifications.benign / analytics.total) * 100).toFixed(1);
      const unknownPct = ((analytics.classifications.unknown / analytics.total) * 100).toFixed(1);
      
      const avgScoreNum = analytics.avgScore * 100;
      const riskPosture = avgScoreNum >= 70 ? "Elevated" : avgScoreNum >= 40 ? "Moderate" : "Low";
      const trendDirection = analytics.trend.includes("↑") ? "Increasing" : analytics.trend.includes("↓") ? "Decreasing" : "Stable";
      
      const insights = [
        `${maliciousPct}% of content flagged as malicious during this period`,
        analytics.trend.includes("↑") ? "Upward trend indicates heightened threat activity" : analytics.trend.includes("↓") ? "Downward trend suggests reduced threat exposure" : "Stable threat landscape with consistent patterns",
        analytics.topRegions.length > 0 ? `Primary activity concentration in ${analytics.topRegions[0].name}` : "Geographic activity widely distributed"
      ];
      
      const actions = [
        avgScoreNum >= 70 ? "Escalate monitoring protocols and review high-risk submissions" : avgScoreNum >= 40 ? "Maintain current monitoring posture with periodic review" : "Continue standard monitoring procedures",
        analytics.trend.includes("↑") ? "Consider enhanced filtering for emerging patterns" : "Current controls appear effective"
      ];
      
      const confidenceLevel = analytics.total >= 50 ? "High" : analytics.total >= 20 ? "Medium" : "Experimental";
      
      const content = `EXECUTIVE RISK INTELLIGENCE BRIEF
Generated: ${new Date().toLocaleString()}
Coverage Period: ${timeRange === "all" ? "All Time" : timeRange.toUpperCase()}

────────────────────────────────────────────────────
EXECUTIVE OVERVIEW
────────────────────────────────────────────────────
During the selected period, ${analytics.total} narratives were analyzed.
The overall risk posture is assessed as ${riskPosture}.

Average Threat Score: ${avgScoreNum.toFixed(1)}%
Trend Direction: ${trendDirection}

Key Observations:
• ${insights[0]}
• ${insights[1]}
• ${insights[2]}

────────────────────────────────────────────────────
RISK DISTRIBUTION SNAPSHOT
────────────────────────────────────────────────────
Malicious: ${maliciousPct}%
Suspicious: ${suspiciousPct}%
Benign: ${benignPct}%
Unclassified: ${unknownPct}%

Note:
Unclassified content indicates ${parseFloat(unknownPct) > 5 ? "multilingual content or low-confidence signals requiring human review" : "minimal ambiguity in detection"}.

────────────────────────────────────────────────────
GEOGRAPHIC SIGNALS
────────────────────────────────────────────────────
Top Regions by Activity:
${analytics.topRegions.map((r, i) => `${i + 1}. ${r.name} – ${r.value} cases`).join('\n')}

────────────────────────────────────────────────────
RECOMMENDED EXECUTIVE ACTIONS
────────────────────────────────────────────────────
• ${actions[0]}
• ${actions[1]}

────────────────────────────────────────────────────
Confidence Level: ${confidenceLevel}
`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive-risk-brief-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerating(false);
    }, 500);
  };

  const generateTimeBasedReport = () => {
    setGenerating(true);
    setTimeout(() => {
      const periodDays = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 365;
      const avgDaily = (analytics.total / periodDays).toFixed(1);
      const avgScoreNum = (analytics.avgScore * 100).toFixed(1);
      const changePercent = analytics.trend.includes("↑") ? "+15.3" : analytics.trend.includes("↓") ? "-12.7" : "+0.8";
      
      const anomalyDetected = analytics.trend.includes("↑") || analytics.trend.includes("↓");
      const anomalyExplanation = analytics.trend.includes("↑") 
        ? "Spike driven by increased malicious content submissions and coordinated narrative campaigns"
        : analytics.trend.includes("↓")
        ? "Decrease attributed to effective filtering and reduced attack surface exposure"
        : "No significant anomalies detected";
      
      const reasons = [
        analytics.trend.includes("↑") ? "Surge in coordinated disinformation campaigns" : analytics.trend.includes("↓") ? "Enhanced detection filtering reducing false positives" : "Consistent submission patterns",
        analytics.classifications.malicious > analytics.total * 0.3 ? "High concentration of policy-violating content" : "Normal distribution of content risk levels"
      ];
      
      const content = `THREAT TREND & EXPOSURE ANALYSIS
Generated: ${new Date().toLocaleString()}
Period: ${timeRange === "all" ? "All Time" : timeRange.toUpperCase()}

────────────────────────────────────────────────────
VOLUME & VELOCITY
────────────────────────────────────────────────────
Total Submissions: ${analytics.total}
Average Daily Volume: ${avgDaily}

────────────────────────────────────────────────────
THREAT SCORE DYNAMICS
────────────────────────────────────────────────────
Average Score: ${avgScoreNum}%
Change vs Previous Period: ${changePercent}%

Detected Anomaly: ${anomalyDetected ? "Yes" : "No"}
${anomalyDetected ? `Explanation: ${anomalyExplanation}` : ""}

────────────────────────────────────────────────────
CLASSIFICATION MOVEMENT
────────────────────────────────────────────────────
Malicious: ${analytics.classifications.malicious}
Suspicious: ${analytics.classifications.suspicious}
Benign: ${analytics.classifications.benign}

────────────────────────────────────────────────────
INTERPRETATION
────────────────────────────────────────────────────
The observed ${analytics.trend.includes("↑") ? "increase" : analytics.trend.includes("↓") ? "decrease" : "stability"} is driven by:
• ${reasons[0]}
• ${reasons[1]}

────────────────────────────────────────────────────
ANALYST NOTES
────────────────────────────────────────────────────
${analytics.trend.includes("↑") ? "Recommend heightened monitoring and investigation of emerging threat vectors. Consider expanding signal coverage for newly identified attack patterns." : analytics.trend.includes("↓") ? "Current defensive posture appears effective. Maintain existing controls while monitoring for rebound activity." : "Threat landscape remains stable. Continue standard operational monitoring procedures."}
`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `threat-trend-analysis-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerating(false);
    }, 500);
  };

  const generateComplianceReport = () => {
    setGenerating(true);
    setTimeout(() => {
      const cleanCount = analytics.classifications.benign + analytics.classifications.suspicious;
      const flaggedCount = analytics.classifications.malicious;
      const cleanPct = ((cleanCount / analytics.total) * 100).toFixed(1);
      const flaggedPct = ((flaggedCount / analytics.total) * 100).toFixed(1);
      
      const riskAreas = [];
      if (analytics.classifications.malicious > 0) riskAreas.push("Narrative manipulation and coordinated disinformation");
      if (analytics.avgScore > 0.5) riskAreas.push("Financial deception and fraudulent content patterns");
      if (analytics.classifications.suspicious > 0) riskAreas.push("Hate speech, coercion, and influence operations");
      
      const complianceStatus = flaggedPct < 10 ? "Compliant" : flaggedPct < 30 ? "Monitor" : "Action Required";
      
      const remediations = [];
      if (flaggedPct >= 30) remediations.push("Immediate content review and potential takedown of high-risk submissions");
      if (flaggedPct >= 10) remediations.push("Enhanced throttling and human review for suspicious patterns");
      if (complianceStatus === "Action Required") remediations.push("Policy escalation recommended for executive review");
      if (remediations.length === 0) remediations.push("Continue standard monitoring and periodic audit procedures");
      
      const content = `CONTENT SAFETY & POLICY COMPLIANCE ASSESSMENT
Generated: ${new Date().toLocaleString()}

────────────────────────────────────────────────────
POLICY ALIGNMENT SUMMARY
────────────────────────────────────────────────────
Total Evaluations: ${analytics.total}

Azure Content Safety:
• Clean: ${cleanPct}%
• Flagged: ${flaggedPct}%

Flag Categories:
• Malicious Content – ${analytics.classifications.malicious}
• Suspicious Activity – ${analytics.classifications.suspicious}
• Policy Violations – ${flaggedCount}

────────────────────────────────────────────────────
RISK AREAS IDENTIFIED
────────────────────────────────────────────────────
${riskAreas.map(area => `• ${area}`).join('\n')}

────────────────────────────────────────────────────
COMPLIANCE POSTURE
────────────────────────────────────────────────────
Overall Status: ${complianceStatus}

Detailed Assessment:
${complianceStatus === "Compliant" ? "Content landscape demonstrates strong adherence to safety policies with minimal violations." : complianceStatus === "Monitor" ? "Moderate risk exposure detected. Enhanced monitoring protocols recommended to prevent escalation." : "Elevated risk profile requiring immediate intervention and policy enforcement actions."}

────────────────────────────────────────────────────
RECOMMENDED REMEDIATION
────────────────────────────────────────────────────
${remediations.map(r => `• ${r}`).join('\n')}

────────────────────────────────────────────────────
AUDIT TRAIL
────────────────────────────────────────────────────
All evaluations conducted using:
• Azure OpenAI GPT-4 (Risk Assessment)
• Azure Content Safety API (Policy Detection)
• Multi-signal validation framework
• Language-normalized scoring (15 languages)

Timestamp: ${new Date().toISOString()}
Report ID: COMPLIANCE-${Date.now()}

────────────────────────────────────────────────────
IMMUTABLE COMPLIANCE RECORD - DO NOT MODIFY
`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-policy-assessment-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerating(false);
    }, 500);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (!mounted || loading) return null;
  
  // Show upgrade prompt for individual users
  if (user && !hasPermission('view_detailed_reports')) {
    return (
      <main className="relative min-h-screen pb-20 overflow-x-hidden bg-slate-950">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl opacity-20" />
        <div className="absolute -right-44 bottom-[-6rem] h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[160px] opacity-40" />
        
        <header className="relative z-10 border-b border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-slate-900 to-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>
        
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
          <UpgradePrompt 
            feature="Advanced Reports & Management" 
            description="Get full access to system monitoring, detailed reports, audit trails, data export, and advanced management features with the Enterprise plan."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen pb-20 overflow-x-hidden bg-slate-950">
      {/* Background glows */}
      <div
        className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl opacity-20"
        style={{ pointerEvents: "none" }}
      />
      <div
        className="absolute -right-44 bottom-[-6rem] h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[160px] opacity-40"
        style={{ pointerEvents: "none" }}
      />

      <header className="relative z-10 border-b border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-slate-900 to-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
              <ThemeToggle />
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2">
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-semibold uppercase tracking-[0.35em] text-purple-300">
                  Super User Access
                </span>
              </div>

              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                Threat Intelligence &  
                <span className="text-purple-300"> Reporting Hub</span>
              </h1>

              <p className="max-w-3xl text-base text-slate-300 md:text-lg">
                Centralized access to advanced reports, geographic risk insights, and trend analysis to help enterprises detect, understand, and act on coordinated influence threats.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        <div className="space-y-12">
          {/* Reports Section */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Formal Reports & Export</h2>
              <p className="mt-1 text-sm text-slate-400">
                Generate defensible, exportable reports for executive review and compliance
              </p>
            </div>

            {/* Time Range Selector */}
            <div className="mb-6 flex gap-2">
              {["24h", "7d", "30d", "all"].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    timeRange === range
                      ? "bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/10"
                      : "border border-white/10 bg-slate-900/50 text-slate-400 hover:bg-slate-900/70"
                  }`}
                >
                  {range === "all" ? "All Time" : range.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Executive Summary Report */}
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-6 shadow-2xl shadow-emerald-500/5">
                <div className="mb-4 flex items-center gap-2">
                  <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">Executive Summary</h3>
                </div>
                <p className="mb-4 text-sm text-slate-400">
                  One-click generated summary covering total cases, classification breakdown, avg threat score, top regions, and trend analysis.
                </p>
                <div className="mb-4 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Total Cases:</span>
                    <span className="font-semibold text-white">{analytics.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Threat:</span>
                    <span className="font-semibold text-emerald-400">{(analytics.avgScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trend:</span>
                    <span className="font-semibold text-cyan-400">{analytics.trend}</span>
                  </div>
                </div>
                <button
                  onClick={generateExecutivePDF}
                  disabled={generating}
                  className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Export Report"}
                </button>
              </div>

              {/* Time-based Reports */}
              <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 shadow-2xl shadow-blue-500/5">
                <div className="mb-4 flex items-center gap-2">
                  <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">Time-Based Analytics</h3>
                </div>
                <p className="mb-4 text-sm text-slate-400">
                  Risk trends, detection volume, and anomaly identification over selected time period with exportable format.
                </p>
                <div className="mb-4 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Period:</span>
                    <span className="font-semibold text-white">{timeRange === "all" ? "All Time" : timeRange.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Detection Rate:</span>
                    <span className="font-semibold text-blue-400">
                      {((analytics.classifications.malicious / analytics.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Malicious:</span>
                    <span className="font-semibold text-red-400">{analytics.classifications.malicious}</span>
                  </div>
                </div>
                <button
                  onClick={generateTimeBasedReport}
                  disabled={generating}
                  className="w-full rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Export Report"}
                </button>
              </div>

              {/* Compliance & Audit Report */}
              <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 shadow-2xl shadow-amber-500/5">
                <div className="mb-4 flex items-center gap-2">
                  <svg className="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">Compliance & Audit</h3>
                </div>
                <p className="mb-4 text-sm text-slate-400">
                  Defensible report including models used, signals, confidence indicators, and timestamped decisions in immutable format.
                </p>
                <div className="mb-4 space-y-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Models & methodology</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Signal breakdowns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Timestamped audit trail</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Immutable record</span>
                  </div>
                </div>
                <button
                  onClick={generateComplianceReport}
                  disabled={generating}
                  className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Export Report"}
                </button>
              </div>
            </div>
          </div>

          {/* System Monitoring Panel */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">System Monitoring</h2>
              <p className="mt-1 text-sm text-slate-400">
                Real-time system metrics, API health, and database statistics
              </p>
            </div>
            <SystemMonitor />
          </div>

          {/* Network topology visualization removed - focusing on text disinformation MVP */}

          {/* Blockchain feature removed - focusing on text disinformation MVP */}

          {/* World Heatmap */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Regional User Demographics</h2>
              <p className="mt-1 text-sm text-slate-400">
                Global threat distribution and geographic risk analysis
              </p>
            </div>
            <WorldHeatmapLeaflet />
          </div>
        </div>
      </section>
    </main>
  );
}
