"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "recharts";

export default function AnalyticsPage() {
  const [results, setResults] = useState([]);
  const [timeRange, setTimeRange] = useState("7d"); // 24h, 7d, 30d, all

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
      const cls = (r.classification || "unknown").toLowerCase();
      if (cls.includes("malicious")) classifications.malicious++;
      else if (cls.includes("suspicious")) classifications.suspicious++;
      else if (cls.includes("benign")) classifications.benign++;
      else classifications.unknown++;
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
        dailyData[date] = { date, malicious: 0, suspicious: 0, benign: 0, total: 0 };
      }
      const cls = (r.classification || "").toLowerCase();
      if (cls.includes("malicious")) dailyData[date].malicious++;
      else if (cls.includes("suspicious")) dailyData[date].suspicious++;
      else if (cls.includes("benign")) dailyData[date].benign++;
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

    return {
      total: filtered.length,
      classifications: Object.entries(classifications).map(([name, value]) => ({ name, value })),
      platforms: Object.entries(platforms).map(([name, value]) => ({ name, value })),
      dailyTrend: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      scoreDistribution: Object.entries(scoreRanges).map(([name, value]) => ({ name, value })),
      topRegions,
      avgScore: filtered.reduce((sum, r) => sum + (r.composite_score || 0), 0) / (filtered.length || 1),
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
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Classification Pie Chart */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
          <h3 className="mb-4 text-lg font-semibold text-white">Classification Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.classifications}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.classifications.map((entry) => (
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

        {/* Platform Breakdown */}
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
      </div>
    </div>
  );
}
