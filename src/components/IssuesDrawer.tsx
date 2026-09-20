import React, { useState } from 'react';
import { X, AlertTriangle, Info, CheckCircle2, ShieldAlert, Check, Filter } from 'lucide-react';
import { ImportIssue } from '../types';

interface IssuesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  issues: ImportIssue[];
  templateName: string;
  onUpdateIssueStatus: (issueId: string, status: 'UNRESOLVED' | 'RESOLVED' | 'DISMISSED') => Promise<void>;
}

export const IssuesDrawer: React.FC<IssuesDrawerProps> = ({
  isOpen,
  onClose,
  issues,
  templateName,
  onUpdateIssueStatus
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'UNRESOLVED' | 'RESOLVED' | 'DISMISSED'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  if (!isOpen) return null;

  const filteredIssues = issues.filter(issue => {
    const matchesStatus = filterStatus === 'all' || issue.resolution_status === filterStatus;
    const matchesCategory = categoryFilter === 'all' || issue.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const categories = Array.from(new Set(issues.map(i => i.category)));

  return (
    <div
      id="issues-drawer-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end select-none"
    >
      <div
        id="issues-drawer-panel"
        className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import & Fidelity Issues Log</h3>
              <p className="text-[11px] text-slate-500 truncate max-w-xs">
                {templateName} &bull; {issues.length} total logged notices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All ({issues.length})</option>
              <option value="UNRESOLVED">Unresolved ({issues.filter(i => i.resolution_status === 'UNRESOLVED').length})</option>
              <option value="RESOLVED">Resolved ({issues.filter(i => i.resolution_status === 'RESOLVED').length})</option>
              <option value="DISMISSED">Dismissed ({issues.filter(i => i.resolution_status === 'DISMISSED').length})</option>
            </select>
          </div>

          {categories.length > 1 && (
            <div className="flex items-center space-x-1">
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Informational Guidance */}
        <div className="p-3.5 bg-orange-50/70 border-b border-orange-200 text-xs text-orange-950 leading-relaxed">
          <p className="font-bold text-orange-900 mb-0.5">Content Preservation Policy:</p>
          No spreadsheet row or observation is silently discarded. Unsupported markup or non-standard rows are safely sanitized and permanently indexed here for review.
        </div>

        {/* Issues List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No Issues Found</p>
              <p className="text-xs text-slate-400">All rows and tags conform strictly to the extraction standard.</p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800 font-mono font-bold text-[10px]">
                    {issue.category}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {issue.source_location || (issue.source_row ? `Row ${issue.source_row}` : '')}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        issue.resolution_status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : issue.resolution_status === 'DISMISSED'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {issue.resolution_status}
                    </span>
                  </div>
                </div>

                <p className="text-slate-800 leading-relaxed">{issue.message}</p>

                {issue.raw_snippet && (
                  <div className="bg-slate-900 text-slate-200 p-2 rounded text-[10px] font-mono overflow-x-auto">
                    <code>{issue.raw_snippet}</code>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-end space-x-2">
                  {issue.resolution_status !== 'RESOLVED' && (
                    <button
                      onClick={() => onUpdateIssueStatus(issue.id, 'RESOLVED')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-300 rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {issue.resolution_status !== 'DISMISSED' && (
                    <button
                      onClick={() => onUpdateIssueStatus(issue.id, 'DISMISSED')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Dismiss
                    </button>
                  )}
                  {issue.resolution_status !== 'UNRESOLVED' && (
                    <button
                      onClick={() => onUpdateIssueStatus(issue.id, 'UNRESOLVED')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-amber-700 border border-amber-300 rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
