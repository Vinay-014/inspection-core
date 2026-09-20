import React from 'react';
import {
  Layers,
  FolderTree,
  FileSpreadsheet,
  FileText,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  ChevronRight,
  ClipboardList,
  Sparkles,
  Home,
  Zap,
  Flame,
  Droplet,
  Compass,
  FileDown,
  Upload
} from 'lucide-react';
import { Template } from '../types';
import { exportTemplateAsSpectoraXlsx } from '../lib/export';

interface InspectorOverviewProps {
  templates: Template[];
  onSelectTemplate: (templateId: string) => void;
  onNavigateLibrary: () => void;
  onNavigateLanding?: () => void;
  onOpenCreate: () => void;
  onOpenImport: () => void;
  onDuplicateTemplate: (templateId: string) => Promise<void>;
  isDuplicating: string | null;
}

export const InspectorOverview: React.FC<InspectorOverviewProps> = ({
  templates,
  onSelectTemplate,
  onNavigateLibrary,
  onNavigateLanding,
  onOpenCreate,
  onOpenImport,
  onDuplicateTemplate,
  isDuplicating
}) => {
  // Aggregate real stats from DB templates
  const totalSystems = templates.reduce((acc, t) => acc + (Number(t.total_sections) || 0), 0);
  const totalItems = templates.reduce((acc, t) => acc + (Number(t.total_items) || 0), 0);
  const totalComments = templates.reduce((acc, t) => acc + (Number(t.total_comments) || 0), 0);

  // Standard inspection system categories
  const systemCategories = [
    { title: 'Roofing & Attics', icon: Home, desc: 'Coverings, flashings, skylights, gutters & ventilation' },
    { title: 'Exterior Envelope', icon: Compass, desc: 'Wall cladding, eaves, trim, doors, windows & decks' },
    { title: 'Electrical Service', icon: Zap, desc: 'Service entrance, panels, breakers, wiring & GFCI outlets' },
    { title: 'Heating & Cooling', icon: Flame, desc: 'Furnaces, heat pumps, AC units, distribution & thermostats' },
    { title: 'Plumbing Systems', icon: Droplet, desc: 'Supply piping, fixtures, water heaters, drains & venting' },
    { title: 'Structural & Interior', icon: FolderTree, desc: 'Foundation, framing, walls, ceilings, stairs & garage' }
  ];

  const recentTemplates = templates.slice(0, 4);

  return (
    <div id="inspector-overview-view" className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Inspector Welcome Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
              Property Inspection Workspace
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">Verified SOP Standards</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight">
            Inspection Template Operations
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl">
            Manage standardized inspection systems, component inspection points, and defect observation narratives for residential and commercial inspections.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onNavigateLanding && (
            <button
              id="btn-overview-exit-home"
              onClick={onNavigateLanding}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 border border-slate-300 rounded cursor-pointer transition-all shadow-2xs"
              title="Return to Product Home (Public Page)"
            >
              <Home className="w-3.5 h-3.5 text-orange-600" />
              <span>Exit to Home</span>
            </button>
          )}

          <button
            id="btn-overview-import"
            onClick={onOpenImport}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import .XLSX</span>
          </button>

          <button
            id="btn-overview-create"
            onClick={onOpenCreate}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded cursor-pointer transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* 2. Key Operational Metrics (Real from DB) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-600">Active Templates</span>
            <div className="w-7 h-7 rounded bg-orange-50 text-orange-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{templates.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Published inspection standards</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-600">Inspection Systems</span>
            <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderTree className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{totalSystems}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Report sections configured</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-600">Components & Items</span>
            <div className="w-7 h-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{totalItems}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Inspection checkpoints</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-600">Defect Narratives</span>
            <div className="w-7 h-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{totalComments}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Pre-written observations</div>
        </div>
      </div>

      {/* 3. Primary Standards & Templates Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Inspection Standards</h2>
            <p className="text-xs text-slate-500">Ready-to-use template frameworks for field reporting</p>
          </div>
          <button
            onClick={onNavigateLibrary}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center space-x-1 cursor-pointer"
          >
            <span>View All in Library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 sm:p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto shadow-2xs">
              <Upload className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">No Templates in Workspace</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your workspace is currently clean. Upload your Spectora inspection spreadsheet (<code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">.xlsx</code> or <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">.xls</code>) to ingest your systems, checkpoints, and defect narratives, or create a new template from scratch.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                id="btn-overview-empty-import"
                onClick={onOpenImport}
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Inspection Spreadsheet</span>
              </button>
              <button
                id="btn-overview-empty-create"
                onClick={onOpenCreate}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-500" />
                <span>Create Blank Template</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentTemplates.map((template) => (
              <div
                key={template.id}
                id={`overview-template-card-${template.id}`}
                className="bg-white border border-slate-200 hover:border-orange-300 rounded-lg p-4 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 hover:text-orange-600 transition-colors cursor-pointer" onClick={() => onSelectTemplate(template.id)}>
                          {template.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {template.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {template.description || 'Standard residential inspection template with comprehensive systems and defect narratives.'}
                      </p>
                    </div>
                  </div>

                  {/* Structural counts */}
                  <div className="flex items-center space-x-4 text-xs font-medium text-slate-600 pt-1 border-t border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900 font-mono">{template.total_sections || 0}</span>{' '}
                      <span className="text-slate-400">Systems</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 font-mono">{template.total_items || 0}</span>{' '}
                      <span className="text-slate-400">Items</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 font-mono">{template.total_comments || 0}</span>{' '}
                      <span className="text-slate-400">Narratives</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onDuplicateTemplate(template.id)}
                    disabled={isDuplicating === template.id}
                    className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isDuplicating === template.id ? 'Cloning...' : 'Duplicate'}</span>
                  </button>

                  <button
                    id={`btn-open-workspace-${template.id}`}
                    onClick={() => onSelectTemplate(template.id)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Open in Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Inspection Systems Standards Reference */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Standard Inspection Systems</h2>
          <p className="text-xs text-slate-500">
            Core components evaluated during standard home and commercial property inspections
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {systemCategories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded flex items-start space-x-3">
                <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <Icon className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-800">{cat.title}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{cat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
