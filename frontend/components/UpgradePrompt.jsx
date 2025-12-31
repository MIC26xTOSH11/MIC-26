'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function UpgradePrompt({ feature, description }) {
  const { hasPermission } = useAuth();

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 text-center">
      <div className="mx-auto mb-4 rounded-full bg-purple-500/20 p-4 w-16 h-16 flex items-center justify-center">
        <svg className="h-8 w-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        {feature || 'This Feature'} is Enterprise Only
      </h3>
      <p className="text-slate-300 mb-6 max-w-md mx-auto">
        {description || 'Upgrade to Enterprise plan to unlock this feature and get full access to advanced analytics, reports, and management tools.'}
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/signup?upgrade=true"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Upgrade to Enterprise
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-slate-300 font-semibold hover:bg-white/5 transition-all"
        >
          Back to Dashboard
        </Link>
      </div>
      <div className="mt-8 pt-6 border-t border-purple-500/20">
        <p className="text-sm text-slate-400 mb-3">Enterprise features include:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200">Advanced Reports</span>
          <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200">Data Export</span>
          <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200">Management Console</span>
          <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200">Audit Trails</span>
          <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-200">Priority Support</span>
        </div>
      </div>
    </div>
  );
}
