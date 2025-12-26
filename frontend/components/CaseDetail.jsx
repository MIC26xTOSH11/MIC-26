import { useMemo, useState } from "react";
import RadarChart from "./RadarChart";
import { submitAnalystDecision, fetchAuditTrail } from "@/lib/api";

const riskBadgeClasses = {
  "high-risk":
    "border-rose-500/40 bg-rose-500/15 text-rose-200 shadow shadow-rose-500/30",
  "medium-risk":
    "border-amber-500/40 bg-amber-500/15 text-amber-200 shadow shadow-amber-500/30",
  "low-risk":
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 shadow shadow-emerald-500/30",
  "critical":
    "border-red-600/50 bg-red-600/20 text-red-200 shadow shadow-red-600/40",
};

const defaultShareForm = {
  destination: "USA",
  justification: "Trusted cell requesting rapid alerting on hostile narrative.",
  include_personal_data: false,
};

export default function CaseDetail({
  caseData,
  submission,
}) {
  const [formState, setFormState] = useState(defaultShareForm);
  const [showRiskWarning, setShowRiskWarning] = useState(false);
  const [pendingShareData, setPendingShareData] = useState(null);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false); // Toggle for low-level signals
  
  // Analyst decision state
  const [analystNotes, setAnalystNotes] = useState("");
  const [decisionPending, setDecisionPending] = useState(false);
  const [decisionResult, setDecisionResult] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const metadataEntries = useMemo(() => {
    if (!submission?.metadata) return [];
    return Object.entries(submission.metadata).filter(([, value]) => Boolean(value));
  }, [submission]);

  const breakdown = caseData?.breakdown || {};
  const provenance = caseData?.provenance || {};
  const graphSummary = caseData?.graph_summary || {};
  const stylometric = breakdown.stylometric_anomalies || {};
  const heuristics = breakdown.heuristics || [];
  const graphCommunities = graphSummary.communities;
  const gnnClusters = Array.isArray(graphSummary.gnn_clusters)
    ? graphSummary.gnn_clusters
    : [];
  const coordinationAlerts = Array.isArray(graphSummary.coordination_alerts)
    ? graphSummary.coordination_alerts
    : [];
  const propagationChains = Array.isArray(graphSummary.propagation_chains)
    ? graphSummary.propagation_chains
    : [];
  const communitySummaries = useMemo(() => {
    const communities = Array.isArray(graphCommunities) ? graphCommunities : [];
    return communities.map((community) => {
      const entries = [];
      const actors = Array.isArray(community.actors) ? community.actors : [];
      if (actors.length) {
        entries.push({ label: "Actors", value: actors.join(", ") });
      }
      const contentNodes = Array.isArray(community.content)
        ? community.content
        : [];
      if (contentNodes.length) {
        entries.push({ label: "Content", value: contentNodes.join(", ") });
      }
      Object.entries(community || {})
        .filter(([key]) => !["actors", "content"].includes(key))
        .forEach(([key, value]) => {
          if (Array.isArray(value) && value.length) {
            entries.push({
              label: key.replace(/_/g, " "),
              value: value.join(", "),
            });
          } else if (value) {
            entries.push({
              label: key.replace(/_/g, " "),
              value: String(value),
            });
          }
        });
      if (entries.length === 0) {
        entries.push({ label: "Nodes", value: "No entities listed" });
      }
      return entries;
    });
  }, [graphCommunities]);

  // Build explainability bullet points from available data
  // NOTE: This must be before the early return to follow React hooks rules
  const explainabilityPoints = useMemo(() => {
    if (!caseData) return [];
    const points = [];
    const bd = caseData?.breakdown || {};
    const heur = bd.heuristics || [];
    
    // Azure OpenAI reasoning (primary)
    if (bd.azure_openai_reasoning) {
      points.push({
        icon: "🤖",
        text: bd.azure_openai_reasoning,
        source: "Azure OpenAI GPT-4"
      });
    }
    
    // Azure Content Safety flags
    if (bd.azure_safety_result?.flagged_categories?.length > 0) {
      const cats = bd.azure_safety_result.flagged_categories.join(", ");
      points.push({
        icon: "⚠️",
        text: `Content Safety detected potential harm: ${cats}`,
        source: "Azure Content Safety"
      });
    }
    
    // High AI probability
    if (typeof bd.ai_probability === "number" && bd.ai_probability > 0.7) {
      points.push({
        icon: "🔬",
        text: `High probability of AI-generated content (${(bd.ai_probability * 100).toFixed(0)}%)`,
        source: "AI Detection Model"
      });
    }
    
    // Key heuristics (top 3)
    heur.slice(0, 3).forEach(h => {
      if (!h.toLowerCase().includes("azure")) {
        points.push({
          icon: "📊",
          text: h,
          source: "Heuristic Analysis"
        });
      }
    });
    
    // Behavioral risk
    if (typeof bd.behavioral_score === "number" && bd.behavioral_score > 0.6) {
      points.push({
        icon: "🚨",
        text: `Elevated behavioral risk patterns detected (urgency, coordination signals)`,
        source: "Behavioral Analysis"
      });
    }
    
    return points;
  }, [caseData]);

  if (!caseData) {
    return (
      <aside className="rounded-3xl border border-white/5 bg-slate-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur">
        <h2 className="text-2xl font-semibold text-white">Case intelligence</h2>
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-slate-900/60 px-5 py-12 text-center text-sm text-slate-500">
          Waiting for a selection. Choose an intake from the table to populate this
          panel.
        </div>
      </aside>
    );
  }

  const selectedClass = (caseData.classification || "event").toLowerCase();

  const handleShareSubmit = async (event) => {
    event.preventDefault();
    
    const shareData = {
      ...formState,
      intake_id: caseData.intake_id,
    };
    
    // Sharing feature removed - focusing on text disinformation MVP
    // High-risk warning and package building removed
  };
  
  // Analyst decision handlers
  const handleDecision = async (decision) => {
    if (!caseData?.intake_id) return;
    setDecisionPending(true);
    setDecisionResult(null);
    try {
      const result = await submitAnalystDecision(
        caseData.intake_id,
        decision,
        analystNotes,
        "analyst"
      );
      setDecisionResult({ success: true, decision, message: result.message });
      setAnalystNotes("");
      // Refresh audit trail
      loadAuditTrail();
    } catch (error) {
      setDecisionResult({ success: false, message: error.message });
    } finally {
      setDecisionPending(false);
    }
  };
  
  const loadAuditTrail = async () => {
    if (!caseData?.intake_id) return;
    try {
      const data = await fetchAuditTrail(caseData.intake_id);
      setAuditTrail(data.audit_trail || []);
    } catch (error) {
      console.error("Failed to load audit trail:", error);
    }
  };
  
  // Load audit trail when showing it
  const toggleAuditTrail = () => {
    if (!showAuditTrail) {
      loadAuditTrail();
    }
    setShowAuditTrail(!showAuditTrail);
  };

  // const handleConfirmHighRiskShare = async () => { ... }
  // const handleCancelHighRiskShare = () => { ... }

  return (
    <aside className="flex flex-col gap-8 rounded-3xl border border-white/5 bg-slate-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur">
      <header className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-semibold text-white">Case intelligence</h2>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${riskBadgeClasses[selectedClass] || "border-white/10 bg-white/5 text-slate-200"}`}
        >
          {caseData.classification || "Unknown"}
        </span>
      </header>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Intake ID</p>
            <p className="mt-1 font-mono text-xs text-emerald-200" title={caseData.intake_id}>
              {caseData.intake_id}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Composite score
            </p>
            <div className="mt-2">
              {typeof caseData.composite_score === "number" ? (
                <ScoreDial value={caseData.composite_score} />
              ) : (
                <p className="text-slate-400 text-sm">n/a</p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Submitted
            </p>
            <p className="mt-1 text-slate-200">
              {caseData.submitted_at
                ? new Date(caseData.submitted_at).toLocaleString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Graph risk actors
            </p>
            <p className="mt-1 text-slate-200">
              {Array.isArray(graphSummary.high_risk_actors) && graphSummary.high_risk_actors.length
                ? graphSummary.high_risk_actors.join(", ")
                : "None flagged"}
            </p>
          </div>
        </div>
      </section>

      {caseData.decision_reason && (() => {
        // Parse the decision reason into user-friendly insights
        const parseDecisionReason = (reason) => {
          const insights = [];
          
          // Extract AI detection result
          const aiMatch = reason.match(/AI Detector Verdict: (\S+) \((\d+\.?\d*)%/i);
          if (aiMatch) {
            const verdict = aiMatch[1];
            const confidence = parseFloat(aiMatch[2]);
            insights.push({
              icon: verdict.toLowerCase().includes('human') ? '✅' : '🤖',
              label: 'AI Detection',
              value: verdict.replace('-', ' '),
              detail: `${confidence.toFixed(0)}% confidence`,
              tone: confidence < 50 ? 'good' : 'warn'
            });
          }
          
          // Extract emotional manipulation
          const emoMatch = reason.match(/(\d+) urgency terms?, (\d+) valence words?, and (\d+) exclamations?/i);
          if (emoMatch) {
            const urgency = parseInt(emoMatch[1]);
            const valence = parseInt(emoMatch[2]);
            const exclamations = parseInt(emoMatch[3]);
            const total = urgency + valence + exclamations;
            insights.push({
              icon: total > 3 ? '⚠️' : '📝',
              label: 'Emotional Signals',
              value: total > 3 ? 'Elevated' : 'Normal',
              detail: `${urgency} urgency · ${valence} sentiment · ${exclamations} emphasis`,
              tone: total > 3 ? 'warn' : 'neutral'
            });
          }
          
          // Extract coherence
          if (reason.toLowerCase().includes('narrative coherence')) {
            const isLow = reason.toLowerCase().includes('low narrative coherence');
            insights.push({
              icon: isLow ? '🔀' : '📖',
              label: 'Narrative Flow',
              value: isLow ? 'Fragmented' : 'Coherent',
              detail: isLow ? 'Potential topic drift detected' : 'Consistent messaging',
              tone: isLow ? 'warn' : 'good'
            });
          }
          
          // Extract AI likelihood percentage
          const likelihoodMatch = reason.match(/AI detector flagged a (\d+)% likelihood/i);
          if (likelihoodMatch) {
            const likelihood = parseInt(likelihoodMatch[1]);
            insights.push({
              icon: likelihood > 50 ? '🔬' : '👤',
              label: 'AI Probability',
              value: `${likelihood}%`,
              detail: likelihood > 70 ? 'High likelihood of AI generation' : likelihood > 40 ? 'Moderate AI indicators' : 'Likely human-written',
              tone: likelihood > 70 ? 'bad' : likelihood > 40 ? 'warn' : 'good'
            });
          }
          
          return insights;
        };
        
        const insights = parseDecisionReason(caseData.decision_reason);
        
        const toneStyles = {
          good: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', text: 'text-emerald-200' },
          warn: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-200' },
          bad: { border: 'border-rose-500/20', bg: 'bg-rose-500/5', text: 'text-rose-200' },
          neutral: { border: 'border-slate-500/20', bg: 'bg-slate-500/5', text: 'text-slate-200' }
        };
        
        return (
          <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-slate-900/50 px-5 py-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🧠</span>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">Analysis Summary</h3>
            </div>
            
            {insights.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {insights.map((insight, idx) => {
                  const style = toneStyles[insight.tone] || toneStyles.neutral;
                  return (
                    <div 
                      key={idx} 
                      className={`rounded-xl ${style.border} ${style.bg} px-4 py-3`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{insight.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 uppercase tracking-wide">{insight.label}</p>
                          <p className={`text-sm font-semibold ${style.text}`}>{insight.value}</p>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{insight.detail}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No specific signals detected</p>
            )}
          </section>
        );
      })()}

      {/* ==================== WHY WAS THIS FLAGGED? ==================== */}
      {explainabilityPoints.length > 0 && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-2">
            <span>❓</span> Why was this flagged?
          </h3>
          <ul className="mt-4 space-y-3">
            {explainabilityPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm">
                <span className="text-lg">{point.icon}</span>
                <div className="flex-1">
                  <p className="text-slate-200">{point.text}</p>
                  <p className="text-xs text-slate-500 mt-1">Source: {point.source}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ==================== ANALYST DECISION VIEW ==================== */}
      <section className="rounded-2xl border border-purple-500/20 bg-purple-500/5 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-300">
          Analyst Decision
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Record your assessment of this case
        </p>
        
        <div className="mt-4 space-y-4">
          {/* Decision buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDecision("flag")}
              disabled={decisionPending}
              className="flex-1 min-w-[80px] px-4 py-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 text-sm font-medium hover:bg-rose-500/20 transition disabled:opacity-50"
            >
              🚩 Flag
            </button>
            <button
              onClick={() => handleDecision("monitor")}
              disabled={decisionPending}
              className="flex-1 min-w-[80px] px-4 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm font-medium hover:bg-amber-500/20 transition disabled:opacity-50"
            >
              👁️ Monitor
            </button>
            <button
              onClick={() => handleDecision("escalate")}
              disabled={decisionPending}
              className="flex-1 min-w-[80px] px-4 py-2 rounded-lg border border-red-600/40 bg-red-600/10 text-red-200 text-sm font-medium hover:bg-red-600/20 transition disabled:opacity-50"
            >
              ⬆️ Escalate
            </button>
            <button
              onClick={() => handleDecision("dismiss")}
              disabled={decisionPending}
              className="flex-1 min-w-[80px] px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-sm font-medium hover:bg-emerald-500/20 transition disabled:opacity-50"
            >
              ✓ Dismiss
            </button>
          </div>
          
          {/* Analyst notes */}
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Notes (optional)
            </label>
            <textarea
              value={analystNotes}
              onChange={(e) => setAnalystNotes(e.target.value)}
              placeholder="Add context or reasoning for your decision..."
              rows={2}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          
          {/* Decision result message */}
          {decisionResult && (
            <div className={`rounded-lg px-4 py-2 text-sm ${decisionResult.success ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-200 border border-rose-500/30'}`}>
              {decisionResult.message}
            </div>
          )}
        </div>
        
        {/* Audit Trail Toggle */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={toggleAuditTrail}
            className="text-xs text-purple-300 hover:text-purple-200 transition flex items-center gap-2"
          >
            📋 {showAuditTrail ? "Hide" : "View"} Case History & Audit Trail
          </button>
          
          {showAuditTrail && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {auditTrail.length === 0 ? (
                <p className="text-xs text-slate-500">No audit entries yet.</p>
              ) : (
                auditTrail.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-white/5 bg-slate-900/60 px-3 py-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span className="font-medium text-slate-300">{entry.action}</span>
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-slate-500">
                      By: {entry.actor}
                      {entry.payload?.notes && ` — "${entry.payload.notes}"`}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Enterprise Risk Assessment
          </h3>
          <button
            onClick={() => setShowAdvancedAnalysis(!showAdvancedAnalysis)}
            className="text-xs px-3 py-1 rounded-lg border border-white/10 bg-slate-950/60 text-slate-300 hover:bg-slate-900/80 transition-colors"
          >
            {showAdvancedAnalysis ? "Hide" : "Show"} Advanced Analysis
          </button>
        </div>
        
        {/* Azure OpenAI Risk (Primary Signal - Always Visible) */}
        {(breakdown.azure_openai_risk !== null && breakdown.azure_openai_risk !== undefined) && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide text-purple-300">Azure OpenAI Analysis</span>
              <span className="text-sm font-mono font-semibold text-purple-200">
                {(breakdown.azure_openai_risk * 100).toFixed(1)}%
              </span>
            </div>
            {breakdown.azure_openai_reasoning && (
              <p className="text-xs text-slate-300 italic">
                "{breakdown.azure_openai_reasoning}"
              </p>
            )}
          </div>
        )}
        
        {/* Azure Content Safety (Primary Signal - Always Visible) */}
        {(breakdown.azure_safety_score !== null && breakdown.azure_safety_score !== undefined) && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-rose-300">Azure Content Safety</span>
              <span className="text-sm font-mono font-semibold text-rose-200">
                {(breakdown.azure_safety_score * 100).toFixed(1)}%
              </span>
            </div>
            {breakdown.azure_safety_result?.flagged_categories?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {breakdown.azure_safety_result.flagged_categories.map(cat => (
                  <span key={cat} className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-200">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Azure Language (Primary Signal - Always Visible when available) */}
        {(breakdown.detected_language || breakdown.detected_language_name) && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-sky-300">Detected Language</span>
              <span className="text-sm font-mono font-semibold text-sky-200">
                {breakdown.detected_language_name || breakdown.detected_language}
                {breakdown.detected_language ? ` (${breakdown.detected_language})` : ""}
              </span>
            </div>
            {typeof breakdown.language_confidence === "number" && (
              <p className="mt-1 text-xs text-slate-300">
                Confidence: {(breakdown.language_confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
        )}
        
        {/* Low-Level Signals (Hidden by default - Microsoft Imagine Cup requirement) */}
        {showAdvancedAnalysis && (
          <>
            <div className="border-t border-white/10 pt-3 mt-3">
              <p className="text-xs text-slate-400 mb-3 italic">Low-level detection signals (for technical review)</p>
            </div>
            <ScoreBar label="Linguistic confidence" value={breakdown.linguistic_score} color="bg-emerald-400" />
            <ScoreBar label="Behavioral risk" value={breakdown.behavioral_score} color="bg-amber-400" />
            <ScoreBar label="AI Detection probability" value={breakdown.ai_probability} color="bg-cyan-400" />
            {breakdown.ollama_risk !== null && breakdown.ollama_risk !== undefined && (
              <ScoreBar label="Legacy Semantic Risk" value={breakdown.ollama_risk} color="bg-slate-400" />
            )}
          </>
        )}
        
        {/* Model Family Detection */}
        {breakdown.model_family && (
          <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Model Family Detected</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fuchsia-300">{breakdown.model_family}</span>
              <span className="text-xs text-slate-400">
                {breakdown.model_family_confidence ? `${(breakdown.model_family_confidence * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            {showAdvancedAnalysis && breakdown.model_family_probabilities && Object.keys(breakdown.model_family_probabilities).length > 0 && (
              <div className="mt-3 space-y-1">
                {Object.entries(breakdown.model_family_probabilities).map(([family, prob]) => (
                  <div key={family} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{family}</span>
                    <span className="font-mono text-slate-300">{(prob * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stylometric Analysis - Only show in Advanced Mode */}
      {showAdvancedAnalysis && (
        <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Stylometric analysis
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Stylometric Anomalies - Left */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Anomalies
              </h4>
              <ul className="space-y-2 text-sm text-slate-200">
                {Object.keys(stylometric).length === 0 ? (
                  <li className="text-xs text-slate-500">
                    No stylometric anomalies detected.
                  </li>
                ) : (
                  Object.entries(stylometric).map(([key, value]) => (
                    <li
                      key={key}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2"
                    >
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-sm text-emerald-200">
                        {typeof value === "number" ? value.toFixed(2) : String(value)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Signal Radar - Right */}
            <div className="flex justify-center items-start">
              <RadarChart breakdown={breakdown} />
            </div>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Triggered heuristics
        </h3>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-emerald-200">
          {heuristics.length === 0 ? (
            <span className="text-xs text-slate-500">
              No heuristics were triggered for this case.
            </span>
          ) : (
            heuristics.map((heuristic) => (
              <span
                key={heuristic}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs"
              >
                {heuristic}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Provenance checks
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-200">
            Watermark: {provenance.watermark_present ? "detected" : "absent"}
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-200">
            Signature: {provenance.signature_valid ? "valid" : "invalid"}
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-200 col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Content fingerprint (SHA-256)</p>
            <p className="mt-1 font-mono text-[11px] break-all text-emerald-200">
              {provenance.content_hash || "—"}
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-1 text-xs text-slate-400">
          {Array.isArray(provenance.validation_notes) &&
          provenance.validation_notes.length ? (
            provenance.validation_notes.map((note, index) => (
              <li key={index}>• {note}</li>
            ))
          ) : (
            <li>• No additional validation notes.</li>
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Graph intelligence snapshot
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm text-slate-200 md:grid-cols-4">
          <StatCard label="Nodes" value={graphSummary.node_count} />
          <StatCard label="Edges" value={graphSummary.edge_count} />
          <StatCard
            label="Communities"
            value={Array.isArray(graphSummary.communities) ? graphSummary.communities.length : 0}
          />
          <StatCard label="GNN clusters" value={gnnClusters.length} />
        </div>
        <div className="mt-4 space-y-2 text-xs text-slate-400">
          {Array.isArray(graphSummary.communities) && graphSummary.communities.length ? (
            graphSummary.communities.map((community, index) => {
              const summary = communitySummaries[index] || [];
              return (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3"
                >
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                    COMMUNITY {index + 1}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-slate-200">
                    {summary.map((entry, entryIndex) => (
                      <p key={`${index}-${entry.label}-${entryIndex}`}>
                        <span className="mr-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                          {entry.label}:
                        </span>
                        <span className="font-mono text-[11px] text-emerald-200">
                          {entry.value}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/50 px-4 py-3 text-xs text-slate-500">
              No community clusters reported for this intake.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          GNN cluster detections
        </h3>
        {gnnClusters.length ? (
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            {gnnClusters.map((cluster) => (
              <article
                key={cluster.cluster_id}
                className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-slate-500">
                  <span>{cluster.cluster_id}</span>
                  <span className="text-emerald-300">{(cluster.score ?? 0).toFixed(2)}</span>
                </div>
                <div className="mt-3 space-y-1 text-[13px]">
                  {cluster.actors?.length ? (
                    <p>
                      <span className="text-slate-500">Actors:</span>
                      <span className="ml-2 font-mono text-emerald-200">
                        {cluster.actors.join(", ")}
                      </span>
                    </p>
                  ) : null}
                  {cluster.narratives?.length ? (
                    <p>
                      <span className="text-slate-500">Narratives:</span>
                      <span className="ml-2 font-mono text-cyan-200">
                        {cluster.narratives.join(", ")}
                      </span>
                    </p>
                  ) : null}
                  {cluster.content?.length ? (
                    <p>
                      <span className="text-slate-500">Content:</span>
                      <span className="ml-2 font-mono text-amber-200">
                        {cluster.content.join(", ")}
                      </span>
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            No GNN-driven communities have been scored yet for this case.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Cross-platform coordination alerts
        </h3>
        {coordinationAlerts.length ? (
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            {coordinationAlerts.map((alert, index) => (
              <article
                key={`${alert.actor}-${index}`}
                className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-4"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-slate-500">
                  <span>{alert.actor}</span>
                  <span className="text-rose-200">Risk {(alert.risk ?? 0).toFixed(2)}</span>
                </div>
                <div className="mt-3 space-y-1 text-[13px]">
                  {alert.peer_actors?.length ? (
                    <p>
                      <span className="text-slate-500">Peers:</span>
                      <span className="ml-2 font-mono text-emerald-200">
                        {alert.peer_actors.join(", ")}
                      </span>
                    </p>
                  ) : null}
                  {alert.shared_tags?.length ? (
                    <p>
                      <span className="text-slate-500">Shared narratives:</span>
                      <span className="ml-2 font-mono text-cyan-200">
                        {alert.shared_tags.join(", ")}
                      </span>
                    </p>
                  ) : null}
                  {alert.platforms?.length ? (
                    <p>
                      <span className="text-slate-500">Platforms:</span>
                      <span className="ml-2 font-mono text-amber-200">
                        {alert.platforms.join(", ")}
                      </span>
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            No coordination signals flagged between actors for this intake.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Propagation chains
        </h3>
        {propagationChains.length ? (
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            {propagationChains.map((chain, index) => (
              <article
                key={`${chain.path?.join("-") || "chain"}-${index}`}
                className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-4"
              >
                <p className="font-mono text-[12px] text-emerald-200">
                  {(chain.path || []).join(" → ") || "No path computed"}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-400">
                  <span>Likelihood {(chain.likelihood ?? 0).toFixed(2)}</span>
                  <span>
                    Platforms: <span className="font-mono text-amber-200">{(chain.platforms || []).join(", ") || "n/a"}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            Propagation modelling has not surfaced any cross-actor handoffs.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Submitted payload
        </h3>
        <div className="mt-4 space-y-3 text-sm text-slate-200">
          <p className="rounded-xl border border-white/5 bg-slate-900/60 px-4 py-3 text-slate-100">
            {submission?.text || "Source text not available in this session."}
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            {metadataEntries.length ? (
              metadataEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2"
                >
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-200">
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </p>
                </div>
              ))
            ) : (
              <p className="col-span-2 text-xs text-slate-500">
                Metadata was not captured for this intake.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-emerald-200">
            {Array.isArray(submission?.tags) && submission.tags.length ? (
              submission.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">
                No analyst tags applied.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Sharing section removed - focusing on text disinformation MVP */}
      {/* High Risk Warning Dialog removed - sharing feature disabled */}
    </aside>
  );
}

function ScoreBar({ label, value, color }) {
  const safeValue = typeof value === "number" ? Math.max(0, Math.min(value, 1)) : null;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>
          {safeValue === null ? "n/a" : `${Math.round(safeValue * 100)}%`}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`${color} h-full rounded-full transition-all duration-300`}
          style={{ width: safeValue === null ? "4%" : `${Math.round(safeValue * 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-emerald-200">
        {value ?? "—"}
      </p>
    </div>
  );
}

function ScoreDial({ value }) {
  const size = 60;
  const strokeWidth = 5;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  // We want the dial to go from 225 degrees to -45 degrees (a 270 degree arc)
  const arcLength = circumference * 0.75;
  const safeValue = Math.max(0, Math.min(value, 1));
  const offset = arcLength - safeValue * arcLength;
  
  // Determine color based on score
  const scorePercent = safeValue * 100;
  let strokeColor, textColor;
  
  if (scorePercent >= 75) {
    strokeColor = "rgb(239 68 68)"; // red-500
    textColor = "text-red-300";
  } else if (scorePercent >= 50) {
    strokeColor = "rgb(249 115 22)"; // orange-500
    textColor = "text-orange-300";
  } else {
    strokeColor = "rgb(52 211 153)"; // emerald-400
    textColor = "text-emerald-200";
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform rotate-[135deg]">
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={arcLength}
          strokeLinecap="round"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={arcLength}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${textColor} text-sm font-semibold`}>
          {Math.round(safeValue * 100)}%
        </span>
      </div>
    </div>
  );
}
