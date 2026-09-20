import React from 'react';
import {
  Layers,
  LayoutDashboard,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Download,
  Database,
  CheckCircle2,
  FolderTree,
  FileSpreadsheet,
  FileText,
  Building,
  UserCheck,
  Settings,
  ChevronRight,
  Home,
  LogOut,
  ArrowLeft,
  X
} from 'lucide-react';
import { Template } from '../types';

interface SidebarProps {
  activeView: 'landing' | 'overview' | 'library' | 'editor';
  onNavigateView: (view: 'landing' | 'overview' | 'library' | 'editor') => void;
  onOpenImport: () => void;
  onOpenAudit: () => void;
  onOpenIssues: () => void;
  templateCount: number;
  unresolvedIssuesCount: number;
  dbStatus: 'connected' | 'checking' | 'error';
  currentTemplate: Template | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigateView,
  onOpenImport,
  onOpenAudit,
  onOpenIssues,
  templateCount,
  unresolvedIssuesCount,
  dbStatus,
  currentTemplate,
  isMobileOpen,
  onCloseMobile
}) => {
  const handleNav = (view: 'landing' | 'overview' | 'library' | 'editor') => {
    if (onCloseMobile) onCloseMobile();
    onNavigateView(view);
  };

  const handleOpenImport = () => {
    if (onCloseMobile) onCloseMobile();
    onOpenImport();
  };

  const handleOpenAudit = () => {
    if (onCloseMobile) onCloseMobile();
    onOpenAudit();
  };

  const handleOpenIssues = () => {
    if (onCloseMobile) onCloseMobile();
    onOpenIssues();
  };
  return (
    <aside
      id="desktop-sidebar"
      className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 select-none min-h-screen"
    >
      {/* Platform Brand Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between">
          <div
            onClick={() => onNavigateView('overview')}
            className="flex items-center space-x-3 cursor-pointer group min-w-0"
            id="sidebar-brand"
            title="Go to Inspection Overview"
          >
            {/* InspectionCore Brand Icon */}
            <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center text-white font-bold shadow-xs group-hover:bg-orange-500 transition-colors shrink-0">
              <Building className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-bold text-white tracking-tight truncate">
                  InspectionCore
                </span>
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[10px] font-semibold text-orange-400 bg-orange-950/80 px-1.5 py-0.2 rounded border border-orange-800/50">
                  Platform
                </span>
                <span className="text-[10px] text-slate-400 font-mono">v2.5</span>
              </div>
            </div>
          </div>

          {/* Quick Return to Landing Button */}
          <button
            id="sidebar-btn-quick-home"
            onClick={() => onNavigateView('landing')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
            title="Return to Public Home Page"
          >
            <Home className="w-4 h-4 text-orange-400" />
          </button>
        </div>

        {/* Real Database Connection Indicator */}
        <div className="mt-3 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-1.5">
            <Database className="w-3 h-3 text-slate-400" />
            <span className="text-slate-400">Database Cloud:</span>
          </div>
          {dbStatus === 'connected' && (
            <span className="flex items-center text-emerald-400 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Connected
            </span>
          )}
          {dbStatus === 'checking' && (
            <span className="text-amber-400 text-[11px]">Checking...</span>
          )}
          {dbStatus === 'error' && (
            <span className="text-rose-400 font-semibold text-[11px]">Degraded</span>
          )}
        </div>

        {/* Explicit Exit to Public Home Button */}
        <button
          id="sidebar-btn-exit-to-home"
          onClick={() => onNavigateView('landing')}
          className="mt-2.5 w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900/90 hover:bg-orange-950/70 text-slate-300 hover:text-orange-200 border border-slate-800 hover:border-orange-800/60 transition-all cursor-pointer group text-[11px] font-medium"
          title="Exit Workspace & Return to Home Page"
        >
          <div className="flex items-center space-x-1.5">
            <ArrowLeft className="w-3.5 h-3.5 text-orange-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Exit to Home Page</span>
          </div>
          <span className="text-[10px] text-slate-400 group-hover:text-orange-300">Public</span>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {/* 1. Primary Inspections Group */}
        <div className="space-y-1">
          <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Inspection
          </p>

          <button
            id="nav-overview"
            onClick={() => onNavigateView('overview')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'overview'
                ? 'bg-orange-600 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </div>
          </button>

          <button
            id="nav-templates-library"
            onClick={() => onNavigateView('library')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'library'
                ? 'bg-orange-600 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Layers className="w-4 h-4" />
              <span>Template Library</span>
            </div>
            <span
              className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
                activeView === 'library'
                  ? 'bg-orange-700 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {templateCount}
            </span>
          </button>

          <button
            id="nav-product-home"
            onClick={() => onNavigateView('landing')}
            className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer mt-1 border border-slate-800 hover:border-slate-700"
            title="Return to public product home"
          >
            <div className="flex items-center space-x-2.5">
              <Home className="w-4 h-4 text-orange-400" />
              <span>Product Home</span>
            </div>
            <span className="text-[10px] text-orange-400/90 font-medium px-1.5 py-0.5 rounded bg-orange-950/60 border border-orange-800/40">Exit</span>
          </button>
        </div>

        {/* 2. Active Template Workspace (Visible when a template is active) */}
        {currentTemplate && (
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Template
            </p>

            <button
              id="nav-template-workspace"
              onClick={() => onNavigateView('editor')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'editor'
                  ? 'bg-slate-800 text-white border-l-2 border-orange-500 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <FolderTree className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="truncate">{currentTemplate.name}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>
          </div>
        )}

        {/* 3. Data & Tools (Secondary Technical Operations) */}
        <div className="space-y-1">
          <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Data & Tools
          </p>

          <button
            id="nav-import-spreadsheet"
            onClick={onOpenImport}
            className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <Upload className="w-4 h-4 text-slate-400 group-hover:text-orange-400 transition-colors" />
              <span>Import Spreadsheet</span>
            </div>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
              .XLSX
            </span>
          </button>

          <button
            id="nav-preservation-audit"
            onClick={onOpenAudit}
            className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Preservation Audit</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">
              100%
            </span>
          </button>

          <button
            id="nav-issues-log"
            onClick={onOpenIssues}
            className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Sanitization Log</span>
            </div>
            {unresolvedIssuesCount > 0 ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300 font-mono font-bold">
                {unresolvedIssuesCount}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">0</span>
            )}
          </button>
        </div>
      </div>

      {/* Inspector Profile Footer */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs shrink-0">
              <UserCheck className="w-4 h-4 text-orange-400" />
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-slate-200 font-semibold truncate text-xs">Apex Property Inspections</p>
              <p className="text-slate-400 text-[10px] truncate">Certified Master Inspector</p>
            </div>
          </div>
          <button
            id="sidebar-footer-btn-exit"
            onClick={() => onNavigateView('landing')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0 ml-1"
            title="Exit Workspace & Return Home"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-orange-400" />
          </button>
        </div>
      </div>
    </aside>
  );
};
