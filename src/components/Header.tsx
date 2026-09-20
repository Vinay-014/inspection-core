import React from 'react';
import { Layers, Upload, Download, RefreshCw, Database, CheckCircle2, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenImport: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeView: 'list' | 'editor';
  onNavigateHome: () => void;
  dbStatus: 'connected' | 'checking' | 'error';
}

export const Header: React.FC<HeaderProps> = ({
  onOpenImport,
  onRefresh,
  isRefreshing,
  activeView,
  onNavigateHome,
  dbStatus
}) => {
  return (
    <header id="app-header" className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={onNavigateHome} id="brand-logo-container">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm ring-2 ring-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">InspectionCore</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Spectora Template Engine & Importer</p>
          </div>
        </div>

        {/* Center / Status */}
        <div className="hidden md:flex items-center space-x-4" id="system-status-indicator">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>Supabase PostgreSQL:</span>
            {dbStatus === 'connected' && (
              <span className="flex items-center text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1" />
                Live
              </span>
            )}
            {dbStatus === 'checking' && (
              <span className="text-amber-600 animate-pulse">Connecting...</span>
            )}
            {dbStatus === 'error' && (
              <span className="text-rose-600 font-semibold">Offline</span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs font-medium text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>RLS Protected</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3" id="header-action-group">
          {activeView === 'editor' && (
            <button
              id="btn-back-to-templates"
              onClick={onNavigateHome}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              ← Back to Templates
            </button>
          )}

          <a
            id="btn-download-fixture"
            href="/api/fixture/download"
            download="InterNACHI-Residential-HTML-Text.xlsx"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Download committed fixture spreadsheet to test import"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Fixture</span>
          </a>

          <button
            id="btn-refresh-data"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            id="btn-open-importer"
            onClick={onOpenImport}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import Template</span>
          </button>
        </div>
      </div>
    </header>
  );
};
