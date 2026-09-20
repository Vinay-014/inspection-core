import React from 'react';
import {
  Upload,
  RefreshCw,
  Copy,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Home
} from 'lucide-react';
import { Template } from '../types';

interface TopNavProps {
  activeView: 'landing' | 'overview' | 'library' | 'editor';
  currentTemplate: Template | null;
  activeSectionName?: string;
  activeSectionId?: string;
  activeItemName?: string;
  activeItemId?: string;
  activeCommentLabel?: string;
  currentNodeType?: 'template' | 'section' | 'item' | 'comment';
  onNavigateHome: () => void;
  onNavigateLanding?: () => void;
  onNavigateToTemplate?: () => void;
  onNavigateToSection?: (sectionId: string) => void;
  onNavigateToItem?: (sectionId: string, itemId: string) => void;
  onOpenImport: () => void;
  onOpenCreate: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  // Editor-specific states & actions
  isSaving?: boolean;
  isDirty?: boolean;
  onSaveNow?: () => void;
  onDuplicateTemplate?: (id: string) => Promise<void>;
  onOpenAudit?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeView,
  currentTemplate,
  activeSectionName,
  activeSectionId,
  activeItemName,
  activeItemId,
  activeCommentLabel,
  currentNodeType,
  onNavigateHome,
  onNavigateLanding,
  onNavigateToTemplate,
  onNavigateToSection,
  onNavigateToItem,
  onOpenImport,
  onOpenCreate,
  onRefresh,
  isRefreshing,
  isSaving,
  isDirty,
  onSaveNow,
  onDuplicateTemplate,
  onOpenAudit
}) => {
  return (
    <header
      id="top-nav-bar"
      className="bg-white border-b border-slate-200 h-13 px-5 flex items-center justify-between sticky top-0 z-20 select-none"
    >
      {/* Left: Breadcrumbs & Context */}
      <div className="flex items-center space-x-2 text-xs min-w-0">
        {activeView === 'overview' ? (
          <div className="flex items-center space-x-2">
            {onNavigateLanding && (
              <button
                id="top-nav-overview-btn-home"
                onClick={onNavigateLanding}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 hover:text-orange-600 hover:bg-slate-100 transition-colors cursor-pointer group"
                title="Return to Product Home (Public Page)"
              >
                <Home className="w-3.5 h-3.5 text-orange-600 group-hover:scale-110 transition-transform" />
                <span>Home</span>
              </button>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-bold text-slate-900 text-sm tracking-tight">
              Inspection Overview
            </span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span className="text-slate-500 font-medium text-xs hidden sm:inline">
              Workspace Operations
            </span>
          </div>
        ) : activeView === 'library' ? (
          <div className="flex items-center space-x-2">
            {onNavigateLanding && (
              <button
                id="top-nav-library-btn-home"
                onClick={onNavigateLanding}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 hover:text-orange-600 hover:bg-slate-100 transition-colors cursor-pointer group"
                title="Return to Product Home (Public Page)"
              >
                <Home className="w-3.5 h-3.5 text-orange-600 group-hover:scale-110 transition-transform" />
                <span>Home</span>
              </button>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-bold text-slate-900 text-sm tracking-tight">
              Template Library
            </span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span className="text-slate-500 font-medium text-xs hidden sm:inline">
              Standards & Taxonomies
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-slate-600 flex-wrap min-w-0">
            {onNavigateLanding && (
              <>
                <button
                  id="top-nav-editor-btn-home"
                  onClick={onNavigateLanding}
                  className="inline-flex items-center space-x-1 font-semibold text-slate-600 hover:text-orange-600 cursor-pointer transition-colors px-2 py-1 rounded hover:bg-slate-100 shrink-0 text-xs group"
                  title="Return to Product Home (Public Page)"
                >
                  <Home className="w-3.5 h-3.5 text-orange-600 group-hover:scale-110 transition-transform" />
                  <span>Home</span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              </>
            )}

            <button
              id="top-nav-btn-templates-list"
              onClick={onNavigateHome}
              className="inline-flex items-center space-x-1 font-semibold text-slate-600 hover:text-orange-600 cursor-pointer transition-colors px-2 py-1 rounded hover:bg-slate-100 shrink-0 text-xs"
              title="Return to Template Library"
            >
              <span>Templates</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />

            <button
              id="top-nav-btn-template-root"
              onClick={() => onNavigateToTemplate?.()}
              className={`max-w-[180px] truncate px-2 py-1 rounded transition-colors cursor-pointer text-xs ${
                currentNodeType === 'template'
                  ? 'font-bold text-slate-900 bg-slate-100'
                  : 'font-medium text-slate-700 hover:text-orange-600 hover:bg-slate-100'
              }`}
              title={`View ${currentTemplate?.name || 'Template'} details`}
            >
              {currentTemplate?.name || 'Template'}
            </button>

            {activeSectionName && activeSectionId && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <button
                  id="top-nav-btn-section"
                  onClick={() => onNavigateToSection?.(activeSectionId)}
                  className={`max-w-[160px] truncate px-2 py-1 rounded transition-colors cursor-pointer text-xs ${
                    currentNodeType === 'section'
                      ? 'font-bold text-slate-900 bg-slate-100'
                      : 'font-medium text-slate-700 hover:text-orange-600 hover:bg-slate-100'
                  }`}
                  title={`Section: ${activeSectionName}`}
                >
                  {activeSectionName}
                </button>
              </>
            )}

            {activeItemName && activeItemId && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <button
                  id="top-nav-btn-item"
                  onClick={() => {
                    if (activeSectionId) onNavigateToItem?.(activeSectionId, activeItemId);
                  }}
                  className={`max-w-[150px] truncate px-2 py-1 rounded transition-colors cursor-pointer text-xs ${
                    currentNodeType === 'item'
                      ? 'font-bold text-slate-900 bg-slate-100'
                      : 'font-medium text-slate-700 hover:text-orange-600 hover:bg-slate-100'
                  }`}
                  title={`Item: ${activeItemName}`}
                >
                  {activeItemName}
                </button>
              </>
            )}

            {activeCommentLabel && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span className="text-xs font-bold text-orange-600 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200">
                  {activeCommentLabel}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center space-x-2 shrink-0">
        {activeView === 'editor' && currentTemplate ? (
          <>
            {/* Cloud Save Status */}
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs bg-slate-50 border border-slate-200">
              {isSaving ? (
                <div className="flex items-center space-x-1 text-orange-600">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-medium text-[11px]">Saving to Cloud...</span>
                </div>
              ) : isDirty ? (
                <button
                  onClick={onSaveNow}
                  className="flex items-center space-x-1 text-amber-600 hover:text-amber-700 font-bold cursor-pointer text-[11px]"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Unsaved changes (Save)</span>
                </button>
              ) : (
                <div className="flex items-center space-x-1 text-emerald-600 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="font-medium">Saved to Cloud</span>
                </div>
              )}
            </div>

            {/* Quick Clone Current Template */}
            <button
              onClick={() => onDuplicateTemplate?.(currentTemplate.id)}
              className="hidden lg:inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
              title="Duplicate into independent copy"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Clone</span>
            </button>

            {/* Preservation Audit Shortcut */}
            <button
              onClick={onOpenAudit}
              className="hidden lg:inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
              title="View data fidelity audit"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Audit</span>
            </button>
          </>
        ) : (
          <>
            <button
              id="top-nav-btn-import"
              onClick={onOpenImport}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Import .XLSX</span>
            </button>

            <button
              id="top-nav-btn-create"
              onClick={onOpenCreate}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Template</span>
            </button>
          </>
        )}

        {/* Sync / Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-50"
          title="Synchronize database records"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
        </button>

        {/* Exit to Product Home Link */}
        {onNavigateLanding && (
          <button
            id="top-nav-btn-product-home"
            onClick={onNavigateLanding}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 rounded border border-slate-300 transition-all cursor-pointer shadow-2xs"
            title="Return to Product Home (Public Page)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-orange-600" />
            <span>Exit to Home</span>
          </button>
        )}
      </div>
    </header>
  );
};
