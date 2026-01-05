"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import dynamic from "next/dynamic";
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import TeamGrid from "@/components/ui/team-grid";
import RuixenStats from "@/components/ui/ruixen-stats";
import FAQWithSpiral from "@/components/ui/faq-section";
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

// Dynamic imports for animation components
const WebGLOrbs = dynamic(() => import('@/components/WebGLOrbs'), { ssr: false });
const GlowingEffect = dynamic(() => import('@/components/ui/glowing-effect').then(mod => ({ default: mod.GlowingEffect })), { ssr: false });

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const mainRef = useRef(null);
  const sectionsRef = useRef([]);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!mainRef.current || typeof window === 'undefined') return;

    let ticking = false;

    // Scroll progress for gradient shift
    ScrollTrigger.create({
      trigger: mainRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      onUpdate: (self) => {
        if (!ticking) {
          requestAnimationFrame(() => {
            // Zero-G jelly effect based on scroll velocity (softer, steadier)
            const rawVelocity = self.getVelocity() / 1000;
            const clampedVelocity = Math.max(-1.2, Math.min(1.2, rawVelocity));
            const intensity = Math.abs(clampedVelocity);
            const wiggle = clampedVelocity;

            if (intensity > 0.015) {
              gsap.to('.warp-element', {
                scaleX: 1 + intensity * 0.02,
                scaleY: 1 - intensity * 0.015,
                skewY: clampedVelocity * 0.12,
                yPercent: wiggle * 8,
                duration: 0.7,
                ease: 'power2.out',
                overwrite: 'auto'
              });
            }
            
            ticking = false;
          });
          ticking = true;
        }
      }
    });

    // Optimized Parallax sections with direct transforms
    sectionsRef.current.forEach((section, i) => {
      if (!section) return;
      
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
        onUpdate: (self) => {
          const speed = 0.4 + i * 0.2;
          const y = -(self.progress - 0.5) * 120 * speed;
          section.style.transform = `translate3d(0, ${y}px, 0)`;
          section.style.willChange = 'transform';
        }
      });
    });

    // Gentle floating loop for all warp elements (jelly-like drift)
    const bobTweens = gsap.utils.toArray('.warp-element').map((el, idx) =>
      gsap.to(el, {
        y: '+=18',
        duration: 2.6 + (idx % 4) * 0.3,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: (idx % 5) * 0.12,
      })
    );

    return () => {
      bobTweens.forEach(t => t.kill());
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div
      ref={mainRef}
      className="relative min-h-screen overflow-x-hidden"
      style={{
        background: 'linear-gradient(135deg, hsl(240, 30%, 5%) 0%, hsl(250, 35%, 7%) 50%, hsl(260, 25%, 6%) 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Animated Background Layers */}
      <WebGLOrbs isMenuOpen={menuOpen} />

      {/* Cosmic Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 50% 50%, 
              hsla(250, 70%, 50%, 0.2) 0%, 
              transparent 70%)`
          }}
        />
      </div>

      {/* Hamburger Menu */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
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
          <a href="#analytics" className="block text-white hover:text-emerald-400 transition-colors" onClick={() => setMenuOpen(false)}>
            Analytics
          </a>
          <Link href="#features" className="block text-white hover:text-emerald-400 transition-colors" onClick={() => setMenuOpen(false)}>
            Features
          </Link>
          <Link href="#team" className="block text-white hover:text-emerald-400 transition-colors" onClick={() => setMenuOpen(false)}>
            Team
          </Link>
          <a href="#faq" className="block text-white hover:text-emerald-400 transition-colors" onClick={() => setMenuOpen(false)}>
            FAQ
          </a>
          <div className="border-t border-white/10 pt-3 mt-3">
            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                Sign In
              </Button>
            </Link>
          </div>
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

            <h1 className="text-6xl sm:text-7xl lg:text-9xl font-bold tracking-tight text-white mb-6 leading-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                AI-Powered
              </span>
              <br />
              Malign Influence
              <br />
              Detection
            </h1>

            <p className="text-2xl sm:text-3xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Real-time narrative analysis, threat intelligence, and tamper-evident
              federated ledger for investigative teams
            </p>

            <div className="flex justify-center mb-12">
              <Link href="/signup" className="w-full max-w-md">
                <GradientButton className="w-full text-lg py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:scale-105 transition-all duration-300">
                  Get Started Now
                </GradientButton>
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
                { icon: Zap, title: 'Real-time Narrative Scoring', desc: 'Instant analysis with composite scores across multiple dimensions' },
                { icon: Database, title: 'Multi-source Intake', desc: 'Ingest content from text, email, social media, and custom feeds' },
                { icon: Activity, title: 'Live Activity Feed', desc: 'Real-time monitoring with customizable alerts for high-risk content' },
                { icon: BarChart3, title: 'Analytics Dashboards', desc: 'Interactive visualizations revealing patterns and trends' },
                { icon: Lock, title: 'Federated Ledger', desc: 'Tamper-evident audit trail ensuring data integrity' },
                { icon: Shield, title: 'Explainable AI', desc: 'Transparent scoring with detailed rationale' }
              ].map((feature, i) => (
                <div
                  key={i}
                  className="warp-element group relative rounded-3xl overflow-hidden"
                >
                  <GlowingEffect
                    spread={60}
                    glow={true}
                    disabled={false}
                    proximity={100}
                    inactiveZone={0.01}
                    borderWidth={2}
                  />
                  <div className="relative p-8 bg-slate-900/30 backdrop-blur-xl border border-white/10 rounded-3xl hover:border-emerald-400/50 transition-all duration-500">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 group-hover:bg-emerald-500/30 transition-colors">
                      <feature.icon className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-3 text-white">{feature.title}</h3>
                    <p className="text-slate-400">{feature.desc}</p>
                  </div>
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
                { value: '12,847', label: 'Total Analyses' },
                { value: '99.2%', label: 'Accuracy Rate' },
                { value: '<100ms', label: 'Response Time' },
                { value: '24/7', label: 'Monitoring' }
              ].map((stat, i) => (
                <div
                  key={i}
                  className="warp-element text-center p-12 bg-slate-900/30 backdrop-blur-xl border border-white/10 rounded-3xl hover:scale-110 transition-transform duration-500"
                >
                  <div className="text-6xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-600 bg-clip-text text-transparent mb-4">
                    {stat.value}
                  </div>
                  <div className="text-xl text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <div id="team">
          <TeamGrid />
        </div>

        {/* Analytics Stats Section */}
        <div id="analytics">
          <RuixenStats />
        </div>

        {/* FAQ Section */}
        <div id="faq">
          <FAQWithSpiral />
        </div>

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
              <div className="flex justify-center">
                <Link href="/signup" className="w-full max-w-md">
                  <GradientButton className="w-full text-lg py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:scale-105 transition-all duration-300">
                    Get Started Now
                  </GradientButton>
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
