"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { listCases, createEventStream, fetchCase } from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

function bucketizeClassification(value) {
  const label = (value || "").toLowerCase();
  if (!label) return "unknown";

  if (label.includes("malicious")) return "malicious";
  if (label.includes("suspicious")) return "suspicious";
  if (label.includes("benign")) return "benign";

  if (label.includes("critical") || label.includes("high")) return "malicious";
  if (label.includes("medium") || label.includes("moderate")) return "suspicious";
  if (label.includes("low")) return "benign";

  return "unknown";
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [timeRange, setTimeRange] = useState("all"); // 24h, 7d, 30d, all

  useEffect(() => {
    const loadCases = async () => {
      try {
        const data = await listCases(500);
        if (data.cases && data.cases.length > 0) {
          setResults(data.cases);
        }
      } catch (error) {
        console.error("Failed to load cases:", error);
      }
    };
    loadCases();

    // Subscribe to real-time updates
    const source = createEventStream(
      async (event) => {
        const hydrated = await fetchCase(event.intake_id).catch(() => event);
        setResults((prev) => {
          const existing = prev.findIndex((r) => r.intake_id === event.intake_id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = { ...updated[existing], ...hydrated };
            return updated;
          }
          return [hydrated, ...prev];
        });
      },
      () => console.log("Event stream disconnected")
    );

    return () => source.close();
  }, []);

  const analytics = useMemo(() => {
    // Filter by time range
    const now = Date.now();
    const timeFilters = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      all: Infinity,
    };

    const filtered = results.filter((r) => {
      if (!r.submitted_at) return false;
      const timestamp = new Date(r.submitted_at).getTime();
      return now - timestamp <= timeFilters[timeRange];
    });

    // Classification breakdown
    const classifications = {
      malicious: 0,
      suspicious: 0,
      benign: 0,
      unknown: 0,
    };

    filtered.forEach((r) => {
      const bucket = bucketizeClassification(r.classification);
      classifications[bucket] = (classifications[bucket] || 0) + 1;
    });

    // Platform breakdown
    const platforms = {};
    filtered.forEach((r) => {
      const platform = r.platform || "unknown";
      platforms[platform] = (platforms[platform] || 0) + 1;
    });

    // Daily trend
    const dailyData = {};
    filtered.forEach((r) => {
      if (!r.submitted_at) return;
      const date = new Date(r.submitted_at).toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, malicious: 0, suspicious: 0, benign: 0, unknown: 0, total: 0 };
      }
      const bucket = bucketizeClassification(r.classification);
      if (bucket === "malicious") dailyData[date].malicious++;
      else if (bucket === "suspicious") dailyData[date].suspicious++;
      else if (bucket === "benign") dailyData[date].benign++;
      else dailyData[date].unknown++;
      dailyData[date].total++;
    });

    // Score distribution
    const scoreRanges = {
      "0-20": 0,
      "20-40": 0,
      "40-60": 0,
      "60-80": 0,
      "80-100": 0,
    };

    filtered.forEach((r) => {
      if (typeof r.composite_score !== "number") return;
      const score = r.composite_score * 100;
      if (score < 20) scoreRanges["0-20"]++;
      else if (score < 40) scoreRanges["20-40"]++;
      else if (score < 60) scoreRanges["40-60"]++;
      else if (score < 80) scoreRanges["60-80"]++;
      else scoreRanges["80-100"]++;
    });

    // Region breakdown (top 10)
    const regions = {};
    filtered.forEach((r) => {
      if (!r.region) return;
      regions[r.region] = (regions[r.region] || 0) + 1;
    });
    const topRegions = Object.entries(regions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // Enterprise Analytics - Consumer Vulnerability Risk breakdown
    const vulnerabilityRisk = {
      youth: 0,
      general: 0,
      vulnerable: 0,
      elderly: 0,
    };
    filtered.forEach((r) => {
      const risk = r?.breakdown?.consumer_vulnerability_risk;
      if (risk && vulnerabilityRisk.hasOwnProperty(risk)) {
        vulnerabilityRisk[risk]++;
      }
    });

    // Enterprise Analytics - Most common recommended actions
    const actionsCount = {};
    filtered.forEach((r) => {
      const actions = r?.breakdown?.recommended_actions || [];
      actions.forEach((action) => {
        actionsCount[action] = (actionsCount[action] || 0) + 1;
      });
    });
    const topActions = Object.entries(actionsCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    // Azure signal averages (when breakdown is available)
    const azureOpenAiScores = [];
    const azureSafetyScores = [];
    filtered.forEach((r) => {
      const bd = r?.breakdown;
      if (!bd) return;
      if (typeof bd.azure_openai_risk === "number") azureOpenAiScores.push(bd.azure_openai_risk);
      if (typeof bd.azure_safety_score === "number") azureSafetyScores.push(bd.azure_safety_score);
    });

    const avgAzureOpenAiRisk =
      azureOpenAiScores.length > 0
        ? azureOpenAiScores.reduce((sum, v) => sum + v, 0) / azureOpenAiScores.length
        : null;
    const avgAzureSafety =
      azureSafetyScores.length > 0
        ? azureSafetyScores.reduce((sum, v) => sum + v, 0) / azureSafetyScores.length
        : null;

    // Signal Contribution Radar - average signal strengths across all cases
    const signalContributions = [];
    const signals = {
      "OpenAI Risk": { sum: 0, count: 0 },
      "Safety Score": { sum: 0, count: 0 },
      "Behavioral": { sum: 0, count: 0 },
      "Language": { sum: 0, count: 0 },
      "Pattern": { sum: 0, count: 0 },
    };

    filtered.forEach((r) => {
      const bd = r?.breakdown;
      if (!bd) return;
      
      if (typeof bd.azure_openai_risk === "number") {
        signals["OpenAI Risk"].sum += bd.azure_openai_risk;
        signals["OpenAI Risk"].count++;
      }
      if (typeof bd.azure_safety_score === "number") {
        signals["Safety Score"].sum += bd.azure_safety_score;
        signals["Safety Score"].count++;
      }
      if (typeof bd.behavioral_score === "number") {
        signals["Behavioral"].sum += bd.behavioral_score;
        signals["Behavioral"].count++;
      }
      if (typeof bd.language_baseline_factor === "number") {
        signals["Language"].sum += bd.language_baseline_factor;
        signals["Language"].count++;
      }
      if (typeof bd.pattern_match_score === "number") {
        signals["Pattern"].sum += bd.pattern_match_score;
        signals["Pattern"].count++;
      }
    });

    Object.entries(signals).forEach(([signal, data]) => {
      if (data.count > 0) {
        signalContributions.push({
          signal,
          value: ((data.sum / data.count) * 100).toFixed(1),
          fullMark: 100,
        });
      }
    });

    // Comparative Analytics - Compare time periods (enterprise only)
    let comparativeData = null;
    if (timeRange !== "all") {
      // Current period stats
      const currentPeriod = {
        avgScore: filtered.reduce((sum, r) => sum + (r.composite_score || 0), 0) / (filtered.length || 1),
        maliciousCount: filtered.filter((r) => r.classification === "malicious").length,
        total: filtered.length,
      };

      // Previous period (same duration before current period)
      const now = Date.now();
      let prevStart, prevEnd;
      if (timeRange === "24h") {
        prevStart = now - 48 * 60 * 60 * 1000;
        prevEnd = now - 24 * 60 * 60 * 1000;
      } else if (timeRange === "7d") {
        prevStart = now - 14 * 24 * 60 * 60 * 1000;
        prevEnd = now - 7 * 24 * 60 * 60 * 1000;
      } else if (timeRange === "30d") {
        prevStart = now - 60 * 24 * 60 * 60 * 1000;
        prevEnd = now - 30 * 24 * 60 * 60 * 1000;
      }

      const prevPeriod = results.filter((r) => {
        const ts = new Date(r.timestamp).getTime();
        return ts >= prevStart && ts < prevEnd;
      });

      const prevStats = {
        avgScore: prevPeriod.reduce((sum, r) => sum + (r.composite_score || 0), 0) / (prevPeriod.length || 1),
        maliciousCount: prevPeriod.filter((r) => r.classification === "malicious").length,
        total: prevPeriod.length,
      };

      comparativeData = {
        current: currentPeriod,
        previous: prevStats,
        scoreChange: ((currentPeriod.avgScore - prevStats.avgScore) / (prevStats.avgScore || 1)) * 100,
        volumeChange: ((currentPeriod.total - prevStats.total) / (prevStats.total || 1)) * 100,
        maliciousChange: ((currentPeriod.maliciousCount - prevStats.maliciousCount) / (prevStats.maliciousCount || 1)) * 100,
      };
    }

    return {
      total: filtered.length,
      classifications: Object.entries(classifications).map(([name, value]) => ({ name, value })),
      platforms: Object.entries(platforms).map(([name, value]) => ({ name, value })),
      dailyTrend: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      scoreDistribution: Object.entries(scoreRanges).map(([name, value]) => ({ name, value })),
      topRegions,
      vulnerabilityRisk: Object.entries(vulnerabilityRisk)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value })),
      topActions,
      avgScore: filtered.reduce((sum, r) => sum + (r.composite_score || 0), 0) / (filtered.length || 1),
      avgAzureOpenAiRisk,
      avgAzureSafety,
      signalContributions,
      comparativeData,
    };
  }, [results, timeRange]);

  const COLORS = {
    malicious: "#f87171",
    suspicious: "#fbbf24",
    benign: "#4ade80",
    unknown: "#94a3b8",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="mt-2 text-slate-400">
            Insights and trends from {analytics.total} analyzed cases
            <span className="ml-2 text-xs text-emerald-400">({timeRange === "all" ? "All Time" : timeRange.toUpperCase()})</span>
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {["24h", "7d", "30d", "all"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                timeRange === range
                  ? "bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10"
                  : "border border-white/10 bg-slate-900/50 text-slate-400 hover:bg-slate-900/70"
              }`}
            >
              {range === "all" ? "All Time" : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <p className="text-sm text-slate-400">Total Analyzed</p>
          <p className="mt-1 text-3xl font-bold text-white">{analytics.total}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <p className="text-sm text-slate-400">Avg Threat Score</p>
          <p className="mt-1 text-3xl font-bold text-emerald-400">
            {(analytics.avgScore * 100).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <p className="text-sm text-slate-400">Avg Azure OpenAI</p>
          <p className="mt-1 text-3xl font-bold text-purple-300">
            {typeof analytics.avgAzureOpenAiRisk === "number"
              ? `${(analytics.avgAzureOpenAiRisk * 100).toFixed(1)}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <p className="text-sm text-slate-400">Avg Content Safety</p>
          <p className="mt-1 text-3xl font-bold text-rose-300">
            {typeof analytics.avgAzureSafety === "number"
              ? `${(analytics.avgAzureSafety * 100).toFixed(1)}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <p className="text-sm text-slate-400">Malicious Detected</p>
          <p className="mt-1 text-3xl font-bold text-red-400">
            {analytics.classifications.find((c) => c.name === "malicious")?.value || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <p className="text-sm text-slate-400">Detection Rate</p>
          <p className="mt-1 text-3xl font-bold text-yellow-400">
            {analytics.total > 0
              ? (
                  ((analytics.classifications.find((c) => c.name === "malicious")?.value || 0) /
                    analytics.total) *
                  100
                ).toFixed(1)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Trend */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
          <h3 className="mb-4 text-lg font-semibold text-white">Submissions Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
              <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              />
              <Legend wrapperStyle={{ color: "#94a3b8" }} />
              <Line type="monotone" dataKey="malicious" stroke="#f87171" strokeWidth={2} />
              <Line type="monotone" dataKey="suspicious" stroke="#fbbf24" strokeWidth={2} />
              <Line type="monotone" dataKey="benign" stroke="#4ade80" strokeWidth={2} />
              <Line type="monotone" dataKey="unknown" stroke="#94a3b8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Classification Pie Chart */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
          <h3 className="mb-4 text-lg font-semibold text-white">Classification Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.classifications.filter((c) => c.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  value > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.classifications
                  .filter((c) => c.value > 0)
                  .map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name] || "#94a3b8"} />
                  ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Score Distribution */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
          <h3 className="mb-4 text-lg font-semibold text-white">Threat Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
              <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Breakdown - Enterprise Only */}
        {user?.role === 'enterprise' && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
            <h3 className="mb-4 text-lg font-semibold text-white">Platform Sources</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.platforms} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Regions */}
        {analytics.topRegions.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30 lg:col-span-2">
            <h3 className="mb-4 text-lg font-semibold text-white">Top Regions by Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topRegions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Enterprise Analytics - Consumer Vulnerability Risk */}
        {user?.role === 'enterprise' && analytics.vulnerabilityRisk && analytics.vulnerabilityRisk.length > 0 && (
          <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 shadow-2xl shadow-purple-500/5">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Consumer Vulnerability Distribution</h3>
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-300">Enterprise</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.vulnerabilityRisk}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => {
                    const displayName = name === 'youth' ? 'Youth' : 
                                       name === 'vulnerable' ? 'Vulnerable' :
                                       name === 'elderly' ? 'Elderly' : 'General';
                    return `${displayName}: ${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.vulnerabilityRisk.map((entry, index) => {
                    const colors = {
                      youth: '#fb923c',
                      general: '#60a5fa',
                      vulnerable: '#f87171',
                      elderly: '#a78bfa',
                    };
                    return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#94a3b8'} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Enterprise Analytics - Top Recommended Actions */}
        {user?.role === 'enterprise' && analytics.topActions && analytics.topActions.length > 0 && (
          <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-6 shadow-2xl shadow-emerald-500/5">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Most Recommended Actions</h3>
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/30 text-emerald-300">Enterprise</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topActions} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  tick={{ fill: "#94a3b8" }} 
                  width={150}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Signal Contribution Radar - All Roles */}
        {analytics.signalContributions && analytics.signalContributions.length > 0 && (
          <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-6 shadow-2xl shadow-cyan-500/5 lg:col-span-2">
            <h3 className="mb-4 text-lg font-semibold text-white">Signal Contribution Analysis</h3>
            <p className="mb-4 text-sm text-slate-400">
              Average signal strengths across all analyzed cases - shows which detection signals contribute most to threat scoring
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={analytics.signalContributions}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis 
                  dataKey="signal" 
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const offsetY = payload.value === "OpenAI Risk" ? -8 : 0;
                    return (
                      <text
                        x={x}
                        y={y + offsetY}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize={13}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fill: "#94a3b8" }}
                />
                <Radar
                  name="Signal Strength"
                  dataKey="value"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.6}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                  formatter={(value) => `${value}%`}
                />
                <Legend wrapperStyle={{ color: "#94a3b8" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Comparative + Causal Analytics - Enterprise Only */}
        {user?.role === 'enterprise' && analytics.comparativeData && (
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 shadow-2xl shadow-amber-500/5 lg:col-span-2">
            <div className="mb-6 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Comparative Period Analysis</h3>
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/30 text-amber-300">Enterprise</span>
            </div>
            <p className="mb-6 text-sm text-slate-400">
              Compares current period metrics against the previous equivalent period to identify trends and causal patterns
            </p>
            
            <div className="grid gap-6 md:grid-cols-3">
              {/* Threat Score Change */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-400">Avg Threat Score</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    analytics.comparativeData.scoreChange > 0 
                      ? 'bg-red-500/20 text-red-400'
                      : analytics.comparativeData.scoreChange < 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {analytics.comparativeData.scoreChange > 0 ? '↑' : analytics.comparativeData.scoreChange < 0 ? '↓' : '→'}
                    {Math.abs(analytics.comparativeData.scoreChange).toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500">Current Period</p>
                    <p className="text-2xl font-bold text-white">
                      {(analytics.comparativeData.current.avgScore * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Previous Period</p>
                    <p className="text-lg text-slate-400">
                      {(analytics.comparativeData.previous.avgScore * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Volume Change */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-400">Submission Volume</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    analytics.comparativeData.volumeChange > 0 
                      ? 'bg-blue-500/20 text-blue-400'
                      : analytics.comparativeData.volumeChange < 0
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {analytics.comparativeData.volumeChange > 0 ? '↑' : analytics.comparativeData.volumeChange < 0 ? '↓' : '→'}
                    {Math.abs(analytics.comparativeData.volumeChange).toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500">Current Period</p>
                    <p className="text-2xl font-bold text-white">
                      {analytics.comparativeData.current.total}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Previous Period</p>
                    <p className="text-lg text-slate-400">
                      {analytics.comparativeData.previous.total}
                    </p>
                  </div>
                </div>
              </div>

              {/* Malicious Detection Change */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-400">Malicious Cases</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    analytics.comparativeData.maliciousChange > 0 
                      ? 'bg-red-500/20 text-red-400'
                      : analytics.comparativeData.maliciousChange < 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {analytics.comparativeData.maliciousChange > 0 ? '↑' : analytics.comparativeData.maliciousChange < 0 ? '↓' : '→'}
                    {Math.abs(analytics.comparativeData.maliciousChange).toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500">Current Period</p>
                    <p className="text-2xl font-bold text-red-400">
                      {analytics.comparativeData.current.maliciousCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Previous Period</p>
                    <p className="text-lg text-slate-400">
                      {analytics.comparativeData.previous.maliciousCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-medium text-amber-300 mb-2">📊 Causal Insights</p>
              <ul className="space-y-1 text-xs text-slate-300">
                {analytics.comparativeData.scoreChange > 10 && (
                  <li>• Significant increase in threat scores may indicate emerging attack patterns or higher-risk submissions</li>
                )}
                {analytics.comparativeData.volumeChange > 20 && (
                  <li>• Volume spike detected - consider correlating with external events or campaigns</li>
                )}
                {analytics.comparativeData.maliciousChange > 15 && (
                  <li>• Rising malicious detection rate suggests potential coordinated threat activity</li>
                )}
                {Math.abs(analytics.comparativeData.scoreChange) < 5 && Math.abs(analytics.comparativeData.volumeChange) < 5 && (
                  <li>• Stable period-over-period metrics indicate consistent threat landscape</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
