"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import {
  Menu,
  X,
  Shield,
  Zap,
  Database,
  Activity,
  BarChart3,
  Lock,
  FileText,
  Upload,
  Search,
  CheckCircle2,
  Eye,
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Gradient Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[140px]" />
      </div>

      {/* Sticky Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance text-white">
                  AI‑Powered Malign Influence Detection
                </h1>
                <p className="text-lg text-slate-400 text-pretty max-w-xl">
                  Real‑time narrative analysis, threat intelligence, and a tamper‑evident federated ledger for
                  investigative teams.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                    Get Started
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-slate-800/50 backdrop-blur-sm border-white/10 text-white hover:bg-slate-700/50">
                    View Live Demo
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Built for SOCs
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Research teams
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Public sector
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Newsrooms
                </span>
              </div>
            </div>

            {/* Hero Product Mock */}
            <div className="relative">
              <Card className="p-6 bg-slate-900/50 backdrop-blur-xl border-white/10 shadow-2xl">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Total Analyses</p>
                      <p className="text-3xl font-bold text-white">12,847</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Malicious</p>
                      <p className="text-3xl font-bold text-red-400">234</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Suspicious</p>
                      <p className="text-3xl font-bold text-yellow-500">1,092</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Avg Score</p>
                      <p className="text-3xl font-bold text-emerald-400">7.2</p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <p className="text-sm font-semibold mb-4 text-white">Latest Analysis</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Classification</span>
                        <span className="px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded-md">
                          High Risk
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Composite Score</span>
                          <span className="font-semibold text-white">8.4 / 10</span>
                        </div>
                        <div className="w-full bg-slate-800/30 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-emerald-500 to-red-500 h-full w-[84%] rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-white/10 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-400 mb-8">
            Used in labs and pilots for rapid narrative triage
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12 opacity-60">
            <div className="font-semibold text-lg text-slate-300">SecureLabs</div>
            <div className="font-semibold text-lg text-slate-300">ThreatWatch</div>
            <div className="font-semibold text-lg text-slate-300">InfoShield</div>
            <div className="font-semibold text-lg text-slate-300">ResearchOps</div>
            <div className="font-semibold text-lg text-slate-300">CyberDefense</div>
            <div className="font-semibold text-lg text-slate-300">AnalyticsHub</div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10">
              <p className="text-sm text-slate-400 mb-4">
                "TattvaDrishti Shield has transformed our threat analysis workflow. We can now triage narratives in
                real-time with confidence."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500" />
                <div>
                  <p className="font-semibold text-sm text-white">Sarah Chen</p>
                  <p className="text-xs text-slate-400">Security Operations Lead</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10">
              <p className="text-sm text-slate-400 mb-4">
                "The explainable AI and audit trail features make this indispensable for our investigative journalism
                work."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500" />
                <div>
                  <p className="font-semibold text-sm text-white">Marcus Rodriguez</p>
                  <p className="text-xs text-slate-400">Research Director</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section id="features" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white">Comprehensive Detection Platform</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Enterprise-grade tools for identifying and analyzing malign influence across digital channels
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 hover:border-emerald-400/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Real-time Narrative Scoring</h3>
              <p className="text-slate-400 text-sm">
                Instant analysis with composite scores across multiple dimensions of influence and manipulation tactics.
              </p>
            </Card>

            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 hover:border-cyan-400/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                <Database className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Multi-source Intake</h3>
              <p className="text-slate-400 text-sm">
                Ingest content from text, email, social media, and custom feeds. API integrations for seamless
                workflows.
              </p>
            </Card>

            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 hover:border-emerald-400/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Explainable Breakdown</h3>
              <p className="text-slate-400 text-sm">
                Transparent scoring with detailed rationale, identified signals, and confidence intervals for every
                analysis.
              </p>
            </Card>

            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 hover:border-cyan-400/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                <Activity className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Live Activity Feed & Alerts</h3>
              <p className="text-slate-400 text-sm">
                Real-time monitoring with customizable alerts for high-risk content and emerging narrative patterns.
              </p>
            </Card>

            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 hover:border-emerald-400/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Analytics Dashboards & Trends</h3>
              <p className="text-slate-400 text-sm">
                Interactive visualizations revealing patterns, campaign evolution, and influence networks over time.
              </p>
            </Card>

            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 hover:border-cyan-400/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                <Lock className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Federated Ledger</h3>
              <p className="text-slate-400 text-sm">
                Tamper-evident audit trail ensuring data integrity and chain of custody for legal and investigative
                purposes.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 lg:py-32 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white">How It Works</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Three simple steps from content intake to actionable intelligence
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            <Card className="p-8 bg-slate-900/50 backdrop-blur-sm border-white/10 relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                1
              </div>
              <Upload className="w-10 h-10 text-emerald-400 mb-4 mt-4" />
              <h3 className="text-xl font-semibold mb-3 text-white">Ingest</h3>
              <p className="text-slate-400 mb-4">
                Upload or paste content directly, connect social feeds, or integrate via API. Support for text, images,
                and structured data.
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Batch uploads & real-time streams</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Multi-format support</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 bg-slate-900/50 backdrop-blur-sm border-white/10 relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                2
              </div>
              <Search className="w-10 h-10 text-cyan-400 mb-4 mt-4" />
              <h3 className="text-xl font-semibold mb-3 text-white">Analyze</h3>
              <p className="text-slate-400 mb-4">
                AI models generate classification, composite scores, and identify manipulation signals with confidence
                levels.
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span>Multi-dimensional scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span>Explainable AI rationale</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 bg-slate-900/50 backdrop-blur-sm border-white/10 relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                3
              </div>
              <Eye className="w-10 h-10 text-emerald-400 mb-4 mt-4" />
              <h3 className="text-xl font-semibold mb-3 text-white">Investigate</h3>
              <p className="text-slate-400 mb-4">
                Create cases, track campaigns, explore analytics dashboards, and leverage the audit trail for evidence.
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Case management workflows</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Tamper-evident audit logs</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Example JSON Output */}
          <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10">
            <p className="text-sm font-semibold mb-4 text-slate-400">Example Analysis Output</p>
            <pre className="text-xs font-mono bg-slate-950/50 p-4 rounded-lg overflow-x-auto text-slate-300">
              {`{
  "analysis_id": "ana_7k3m9p2x",
  "timestamp": "2025-01-15T14:32:11Z",
  "classification": "high_risk",
  "composite_score": 8.4,
  "signals_detected": [
    "emotional_manipulation",
    "false_authority",
    "coordinated_amplification"
  ],
  "confidence": 0.92,
  "rationale": "Content exhibits multiple manipulation tactics...",
  "ledger_hash": "0x7f3a2c9e..."
}`}
            </pre>
          </Card>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white">Meet Our Team</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              The brilliant minds behind TattvaDrishti Shield
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Omar */}
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 hover:border-emerald-400/50 transition-all duration-300 group">
              <div className="aspect-square rounded-xl mb-4 overflow-hidden relative">
                <Image
                  src="/images/team/Omar.jpeg"
                  alt="Omar"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-1 text-white">Omar</h3>
              <p className="text-sm text-slate-400">Team Lead</p>
            </Card>

            {/* Tanishq */}
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 hover:border-emerald-400/50 transition-all duration-300 group">
              <div className="aspect-square rounded-xl mb-4 overflow-hidden relative">
                <Image
                  src="/images/team/Tanishq.jpeg"
                  alt="Tanishq"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-1 text-white">Tanishq</h3>
              <p className="text-sm text-slate-400">Team Member</p>
            </Card>

            {/* Hansika */}
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 hover:border-emerald-400/50 transition-all duration-300 group">
              <div className="aspect-square rounded-xl mb-4 overflow-hidden relative">
                <Image
                  src="/images/team/Hansika.jpeg"
                  alt="Hansika"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-1 text-white">Hansika</h3>
              <p className="text-sm text-slate-400">Team Member</p>
            </Card>

            {/* Anirudha */}
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 hover:border-emerald-400/50 transition-all duration-300 group">
              <div className="aspect-square rounded-xl mb-4 overflow-hidden relative">
                <Image
                  src="/images/team/Anirudha.jpeg"
                  alt="Anirudha"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-1 text-white">Anirudha</h3>
              <p className="text-sm text-slate-400">Team Member</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-20 lg:py-32 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white">Security & Compliance First</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Built with privacy-by-design principles and enterprise-grade security
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="font-semibold text-white">Audit Trail</p>
              <p className="text-xs text-slate-400 mt-1">Complete provenance tracking</p>
            </Card>
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="font-semibold text-white">Access Controls</p>
              <p className="text-xs text-slate-400 mt-1">Role-based permissions</p>
            </Card>
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Eye className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="font-semibold text-white">Data Minimization</p>
              <p className="text-xs text-slate-400 mt-1">Only store what's needed</p>
            </Card>
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-white/10 text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="font-semibold text-white">Observability</p>
              <p className="text-xs text-slate-400 mt-1">Full system transparency</p>
            </Card>
          </div>

          <Card className="p-8 bg-slate-900/50 backdrop-blur-sm border-white/10">
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-white">Privacy by Design</h3>
                <p className="text-slate-400 mb-4">
                  We handle sensitive content with the highest standards of data protection and user privacy.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">End-to-end encryption for data in transit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Configurable data retention policies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">GDPR and CCPA compliance ready</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-white">Enterprise Controls</h3>
                <p className="text-slate-400 mb-4">
                  Granular access controls and comprehensive audit logs for regulated environments.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">SSO and multi-factor authentication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Immutable audit logs with timestamps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">SOC 2 Type II certification in progress</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-32 bg-slate-900/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white">Frequently Asked Questions</h2>
            <p className="text-lg text-slate-400">Everything you need to know about TattvaDrishti Shield</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-6"
            >
              <AccordionTrigger className="hover:no-underline text-white">
                What does TattvaDrishti Shield actually do?
              </AccordionTrigger>
              <AccordionContent className="text-slate-400">
                TattvaDrishti Shield analyzes narrative content to surface signs of malign influence: emotionally
                manipulative framing, coordinated messaging patterns, suspicious sources, and indicators of synthetic
                or AI-assisted generation. It turns unstructured text into structured signals, scores the overall
                risk, and gives you an explainable breakdown you can act on.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-6"
            >
              <AccordionTrigger className="hover:no-underline text-white">
                How is the composite risk score calculated?
              </AccordionTrigger>
              <AccordionContent className="text-slate-400">
                The composite score (0–10) combines several dimensions our pipeline computes: narrative manipulation
                patterns, coordination signals, harmful content categories, model confidence, and other heuristics.
                Each dimension contributes a weighted sub-score, and we surface the factors driving the final number
                so analysts can see <span className="font-semibold text-slate-200">why</span> something was flagged.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-6"
            >
              <AccordionTrigger className="hover:no-underline text-white">
                What content types and languages are supported?
              </AccordionTrigger>
              <AccordionContent className="text-slate-400">
                The current deployment focuses on text: copy-pasted narratives, social media posts, article excerpts,
                and structured JSON payloads sent via the API. Language support is driven by the underlying Azure
                Language and OpenAI models and includes English, Hindi, Arabic, Spanish, French, German, Portuguese,
                Russian, Chinese, Japanese, Korean, Tamil, Telugu, Urdu, and Bengali.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-6"
            >
              <AccordionTrigger className="hover:no-underline text-white">
                Where is my data stored and who can see it?
              </AccordionTrigger>
              <AccordionContent className="text-slate-400">
                In this reference deployment, submissions and analysis results are stored in the local database that
                backs the dashboard. Content is only sent to the Azure services you configure (OpenAI, Content Safety,
                Language) for scoring and detection. Data is not used to train public models, and you can clear the
                submissions table at any time from your own environment.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-5"
              className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-6"
            >
              <AccordionTrigger className="hover:no-underline text-white">
                How do I integrate this into my workflow?
              </AccordionTrigger>
              <AccordionContent className="text-slate-400">
                You can start directly from the dashboard by pasting narratives into the intake form or uploading
                content for batch analysis. For automation, the same pipeline is exposed through a FastAPI backend,
                so other systems can submit JSON payloads and retrieve scores programmatically. This makes it easy to
                plug TattvaDrishti Shield into existing monitoring, review, or investigation workflows.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-6"
              className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-6"
            >
              <AccordionTrigger className="hover:no-underline text-white">What does "federated ledger" mean?</AccordionTrigger>
              <AccordionContent className="text-slate-400">
                Our federated ledger is a tamper-evident audit trail that records every analysis, user action, and data
                modification with cryptographic hashing. This ensures chain of custody for legal proceedings and
                provides verifiable proof that results haven't been altered. It's not a blockchain but uses similar
                immutability principles.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-7"
              className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-6"
            >
              <AccordionTrigger className="hover:no-underline text-white">
                Can I export my data and analysis results?
              </AccordionTrigger>
              <AccordionContent className="text-slate-400">
                Absolutely. All tiers support JSON and CSV exports. Team and Enterprise tiers can export in additional
                formats including PDF reports with visualizations. You own your data and can export it at any time, even
                after subscription cancellation (within retention period).
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Card className="p-12 lg:p-16 bg-gradient-to-br from-emerald-500/20 via-slate-900/50 to-cyan-500/20 backdrop-blur-xl border-white/10">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-balance text-white">
              Ready to Defend Against Disinformation?
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto text-pretty">
              Join investigative teams, SOCs, and researchers who trust TattvaDrishti Shield for real-time narrative
              analysis
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                  Get Started
                </Button>
              </Link>
              <Link href="/analytics">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-slate-800/50 backdrop-blur-sm border-white/10 text-white hover:bg-slate-700/50">
                  See Insights
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-white">TattvaDrishti</span>
              </div>
              <p className="text-sm text-slate-400">
                AI-powered malign influence detection for investigative teams
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-white">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="#features" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white transition-colors">
                    Demo
                  </Link>
                </li>
                <li>
                  <Link href="/analytics" className="hover:text-white transition-colors">
                    Analytics
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-white">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Case Studies
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-white">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-sm text-slate-400">
            <p>© 2025 TattvaDrishti Shield. All rights reserved. | Protecting truth in the digital age.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
