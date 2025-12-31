"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Navbar({ onMenuClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  const isLandingPage = pathname === "/";
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isAppPage = !isLandingPage && !isAuthPage;

  // Navigation items for landing page
  const landingNavItems = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#team", label: "Team" },
    { href: "#faq", label: "FAQ" },
  ];

  // Navigation items for app pages
  const appNavItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/submissions", label: "Submissions" },
    { href: "/upload", label: "Upload Content" },
    { href: "/analytics", label: "Analytics" },
  ];

  const navItems = isLandingPage ? landingNavItems : appNavItems;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-slate-900/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu for Sidebar (only on app pages) */}
            {isAppPage && (
              <button
                onClick={onMenuClick}
                className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors text-slate-300 hover:text-white"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-white">TattvaDrishti Shield</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? "text-emerald-400"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {isLandingPage && !user && (
              <>
                <Link href="/login">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-slate-300 hover:text-white hover:bg-slate-800/50"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30 text-white hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
            {isLandingPage && user && (
              <Link href="/dashboard">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30 text-white hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all"
                >
                  Dashboard
                </Button>
              </Link>
            )}
            {isAppPage && user && (
              <button
                onClick={logout}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-1 border-t border-white/10">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block text-sm font-medium transition-colors py-2.5 px-2 rounded-lg ${
                    isActive
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            {isLandingPage && !user && (
              <div className="space-y-2 mt-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-slate-300 hover:text-white hover:bg-slate-800/50"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30 text-white"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
            {isLandingPage && user && (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30 text-white"
                >
                  Dashboard
                </Button>
              </Link>
            )}
            {isAppPage && user && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left text-sm font-medium text-slate-300 hover:text-white py-2.5 px-2 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
