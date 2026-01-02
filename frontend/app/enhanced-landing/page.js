"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { Button } from "@/components/ui/button";
import BlobCanvas from "@/components/BlobCanvas";
import HexGrid from "@/components/HexGrid";
import WebGLOrbs from "@/components/WebGLOrbs";
import { FlipCard, FlipCardFront, FlipCardBack } from "@/components/ui/flip-card";
import {
  Menu,
  X,
  Shield,
  Zap,
  Database,
  Activity,
  BarChart3,
  Lock,
  CheckCircle2,
} from "lucide-react";

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function EnhancedLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { user, loading } = useAuth();
  const router = useRouter();
  const mainRef = useRef(null);
  const sectionsRef = useRef([]);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!mainRef.current) return;

    // Scroll progress for gradient shift
    ScrollTrigger.create({
      trigger: mainRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        setScrollProgress(self.progress);
        
        // Zero-G warp effects on all animated elements
        const velocity = self.getVelocity() / 1000;
        
        gsap.to('.warp-element', {
          scaleX: 1 + Math.abs(velocity) * 0.1,
          skewY: velocity * 0.5,
          yPercent: velocity * 2,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    });

    // Parallax sections
    sectionsRef.current.forEach((section, i) => {
      if (!section) return;
      
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
          const speed = 0.5 + i * 0.3; // Different speeds for parallax
          const y = -(self.progress - 0.5) * 200 * speed;
          gsap.to(section, {
            y,
            duration: 0.1
          });
        }
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  // Dynamic gradient based on scroll progress
  const gradientHue = 60 + scrollProgress * 240; // Gold (60) to Purple (300)

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div
      ref={mainRef}
      className="relative min-h-screen overflow-x-hidden"
      style={{
        background: `linear-gradient(135deg, 
          hsl(${gradientHue}, 30%, 8%) 0%, 
          hsl(${gradientHue + 60}, 40%, 10%) 50%,
          hsl(${gradientHue + 120}, 35%, 8%) 100%)`
      }}
    >
      {/* Animated Background Layers */}
      <BlobCanvas />
      <HexGrid />
      <WebGLOrbs isMenuOpen={menuOpen} />

      {/* Cosmic Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 50% 50%, 
              hsla(${gradientHue}, 70%, 50%, 0.2) 0%, 
              transparent 70%)`
          }}
        />
      </div>

      {/* Hamburger Menu */}
      <button
        onClick={toggleMenu}
        className="fixed top-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300"
        aria-label="Toggle menu"
      >
        {menuOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Navigation Menu */}
      <nav
        className={`fixed top-24 right-6 z-40 transition-all duration-500 ${
          menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-3">
          <Link href="/dashboard" className="block text-white hover:text-emerald-400 transition-colors">
            Dashboard
          </Link>
          <Link href="/analytics" className="block text-white hover:text-emerald-400 transition-colors">
            Analytics
          </Link>
          <Link href="#features" className="block text-white hover:text-emerald-400 transition-colors" onClick={() => setMenuOpen(false)}>
            Features
          </Link>
          <Link href="#team" className="block text-white hover:text-emerald-400 transition-colors" onClick={() => setMenuOpen(false)}>
            Team
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-20">
        {/* Hero Section */}
        <section
          ref={el => sectionsRef.current[0] = el}
          className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-7xl mx-auto text-center warp-element">
            <div className="inline-flex items-center gap-3 mb-8 px-6 py-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl border border-white/10 rounded-full">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">
                TattvaDrishti Shield
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight text-white mb-6 leading-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                AI-Powered
              </span>
              <br />
              Malign Influence
              <br />
              Detection
            </h1>

            <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Real-time narrative analysis, threat intelligence, and tamper-evident
              federated ledger for investigative teams
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/dashboard">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-lg px-8 py-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105"
                >
                  Get Started
                </Button>
              </Link>
              <Link href="/analytics">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto text-lg px-8 py-6 bg-slate-800/30 backdrop-blur-sm border-white/20 text-white hover:bg-slate-700/50 transition-all duration-300 hover:scale-105"
                >
                  View Demo
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
              {['SOCs', 'Research Teams', 'Public Sector', 'Newsrooms'].map(item => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          ref={el => sectionsRef.current[1] = el}
          className="min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="text-center mb-16 warp-element">
              <h2 className="text-4xl lg:text-6xl font-bold mb-4 text-white">
                Comprehensive Detection Platform
              </h2>
              <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                Enterprise-grade tools for identifying and analyzing malign influence
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: 'Real-time Narrative Scoring', color: 'emerald', desc: 'Instant analysis with composite scores across multiple dimensions' },
                { icon: Database, title: 'Multi-source Intake', color: 'cyan', desc: 'Ingest content from text, email, social media, and custom feeds' },
                { icon: Activity, title: 'Live Activity Feed', color: 'emerald', desc: 'Real-time monitoring with customizable alerts for high-risk content' },
                { icon: BarChart3, title: 'Analytics Dashboards', color: 'cyan', desc: 'Interactive visualizations revealing patterns and trends' },
                { icon: Lock, title: 'Federated Ledger', color: 'emerald', desc: 'Tamper-evident audit trail ensuring data integrity' },
                { icon: Shield, title: 'Explainable AI', color: 'cyan', desc: 'Transparent scoring with detailed rationale and confidence intervals' }
              ].map((feature, i) => (
                <div
                  key={i}
                  className="warp-element group relative p-8 bg-slate-900/30 backdrop-blur-xl border border-white/10 rounded-3xl hover:border-emerald-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-${feature.color}-500/20 flex items-center justify-center mb-6 group-hover:bg-${feature.color}-500/30 transition-colors`}>
                    <feature.icon className={`w-8 h-8 text-${feature.color}-400`} />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-white">{feature.title}</h3>
                  <p className="text-slate-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section
          ref={el => sectionsRef.current[2] = el}
          className="min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { value: '12,847', label: 'Total Analyses', color: 'emerald' },
                { value: '99.2%', label: 'Accuracy Rate', color: 'cyan' },
                { value: '<100ms', label: 'Response Time', color: 'purple' },
                { value: '24/7', label: 'Monitoring', color: 'teal' }
              ].map((stat, i) => (
                <div
                  key={i}
                  className="warp-element text-center p-12 bg-slate-900/30 backdrop-blur-xl border border-white/10 rounded-3xl hover:scale-110 transition-transform duration-500"
                >
                  <div className={`text-6xl font-bold bg-gradient-to-r from-${stat.color}-400 to-${stat.color}-600 bg-clip-text text-transparent mb-4`}>
                    {stat.value}
                  </div>
                  <div className="text-xl text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section
          id="team"
          ref={el => sectionsRef.current[3] = el}
          className="min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="text-center mb-16 warp-element">
              <h2 className="text-4xl lg:text-6xl font-bold mb-4 text-white">
                Meet Our Team
              </h2>
              <p className="text-xl text-slate-400">
                The brilliant minds behind TattvaDrishti Shield
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { name: 'Omar', role: 'Team Lead', quote: 'Building systems that think before they act.', bio: 'AI/ML engineer and systems thinker, focused on security, detection pipelines, and scalable backend design.' },
                { name: 'Tanishq', role: 'Team Member', quote: 'Engineering intelligence from models to machines.', bio: 'ML engineer with strong DevOps skills, working across model training, deployment, and infrastructure automation.' },
                { name: 'Hansika', role: 'Team Member', quote: 'Designing clarity where complexity lives.', bio: 'Graphic designer and UI/UX specialist, focused on clean interfaces, visual storytelling, and user-centered design.' },
                { name: 'Anirudha', role: 'Team Member', quote: 'Connecting code with real-world impact.', bio: 'Full-stack developer with strengths in business modeling, product thinking, and end-to-end system development.' }
              ].map((member, i) => (
                <div key={i} className="warp-element">
                  <FlipCard className="h-[450px] w-full">
                    <FlipCardFront className="rounded-3xl">
                      <div className="h-full p-6 bg-slate-900/30 backdrop-blur-xl border border-white/10 rounded-3xl">
                        <div className="aspect-square rounded-2xl mb-4 overflow-hidden bg-gradient-to-br from-emerald-500 to-cyan-500 relative">
                          <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white">
                            {member.name[0]}
                          </div>
                        </div>
                        <h3 className="text-2xl font-semibold mb-1 text-white">{member.name}</h3>
                        <p className="text-slate-400">{member.role}</p>
                      </div>
                    </FlipCardFront>
                    
                    <FlipCardBack className="rounded-3xl">
                      <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-teal-500/20 backdrop-blur-xl border border-emerald-400/50 rounded-3xl">
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-emerald-400 shadow-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
                          <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                            {member.name[0]}
                          </div>
                        </div>
                        <p className="text-lg italic text-emerald-300 mb-4 text-center font-medium">
                          "{member.quote}"
                        </p>
                        <p className="text-sm text-slate-300 text-center leading-relaxed">
                          {member.bio}
                        </p>
                      </div>
                    </FlipCardBack>
                  </FlipCard>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section
          ref={el => sectionsRef.current[4] = el}
          className="min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-4xl mx-auto w-full text-center warp-element">
            <div className="p-16 bg-gradient-to-br from-emerald-500/20 via-slate-900/50 to-cyan-500/20 backdrop-blur-xl border border-white/20 rounded-[40px] shadow-2xl">
              <h2 className="text-4xl lg:text-6xl font-bold mb-6 text-white">
                Ready to Defend Against Disinformation?
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Join investigative teams, SOCs, and researchers who trust TattvaDrishti Shield
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-10 py-7 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:scale-105 transition-all duration-300">
                    Get Started Now
                  </Button>
                </Link>
                <Link href="/analytics">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-10 py-7 bg-slate-800/50 backdrop-blur-sm border-white/20 text-white hover:bg-slate-700/50 hover:scale-105 transition-all duration-300">
                    See Insights
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-white/10 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-sm text-slate-400">
            <p>© 2025 TattvaDrishti Shield. All rights reserved. | Protecting truth in the digital age.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
