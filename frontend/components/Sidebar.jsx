"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const menuItems = [
  {
    name: "Dashboard",
    path: "/dashboard",
    permission: "view_dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: "Submissions",
    path: "/submissions",
    permission: "view_dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: "Upload Content",
    path: "/upload",
    permission: "upload_content",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    name: "Analytics",
    path: "/analytics",
    permission: "view_analytics",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: "Reports",
    path: "/superuser",
    permission: "view_detailed_reports",
    requireRole: "enterprise",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    badge: "Enterprise",
  },
  {
    name: "Management",
    path: "/superuser",
    permission: "manage_submissions",
    requireRole: "enterprise",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    badge: "Enterprise",
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { user, hasPermission, hasRole } = useAuth();

  // Filter menu items based on user permissions
  const visibleMenuItems = menuItems.filter(item => {
    if (!user) return false;
    if (item.requireRole && !hasRole(item.requireRole)) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen border-r border-white/10 bg-slate-900/95 backdrop-blur-xl transition-transform duration-300 w-64 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col pt-16">
          {/* User Role Badge */}
          {user && (
            <div className="px-3 pb-2">
              <div className={`rounded-lg p-3 ${
                user.role === 'enterprise' 
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30' 
                  : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Logged in as</p>
                    <p className="text-sm font-semibold text-white">{user.username}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    user.role === 'enterprise'
                      ? 'bg-purple-500/30 text-purple-300'
                      : 'bg-blue-500/30 text-blue-300'
                  }`}>
                    {user.role === 'enterprise' ? ' Pro' : ' Basic'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {visibleMenuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className={isActive ? "text-emerald-400" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-purple-500/30 text-purple-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/10 p-4">
            <div className={`rounded-xl p-4 ${
              user?.role === 'enterprise'
                ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10'
                : 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10'
            }`}>
              <p className="text-xs font-medium text-slate-300">
                {user?.role === 'enterprise' ? 'Enterprise Plan' : 'Individual Plan'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {user?.role === 'enterprise' 
                  ? 'Full access to all features'
                  : 'Basic analysis & uploads'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
        />
      )}
    </>
  );
}
