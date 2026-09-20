import React, { useState, useMemo } from 'react';
import {
  Layers,
  FileSpreadsheet,
  Plus,
  Search,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  FolderTree,
  FileText,
  Copy,
  Trash2,
  Edit3,
  Download,
  ShieldCheck,
  Clock,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  Upload,
  MoreVertical,
  Building,
  Home
} from 'lucide-react';
import { Template } from '../types';
import { exportTemplateAsJson, exportTemplateAsSpectoraXlsx } from '../lib/export';

interface TemplateListProps {
  templates: Template[];
  onSelectTemplate: (templateId: string) => void;
  onNavigateLanding?: () => void;
  onDuplicateTemplate: (templateId: string, customName?: string) => Promise<void>;
  onDeleteTemplate: (template: Template) => void;
  onOpenAudit: (template: Template) => void;
  onOpenImport: () => void;
  onOpenCreate: () => void;
  isDuplicating: string | null;
  isDeleting: string | null;
}

type SortField = 'name' | 'updated_at' | 'total_sections' | 'total_items' | 'total_comments';
type SortOrder = 'asc' | 'desc';

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  onSelectTemplate,
  onNavigateLanding,
  onDuplicateTemplate,
  onDeleteTemplate,
  onOpenAudit,
  onOpenImport,
  onOpenCreate,
  isDuplicating,
  isDeleting
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'standard' | 'custom' | 'cloned'>('all');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Filter & Sort logic
  const filteredTemplates = useMemo(() => {
    return templates
      .filter(t => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          t.name.toLowerCase().includes(q) ||
          (t.source_filename && t.source_filename.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q));

        const isCloned = Boolean(t.copied_from_template_id);
        const isCustom = t.source_type === 'custom';
        const isStandard = !isCloned && !isCustom;

        const matchesSource =
          sourceFilter === 'all' ||
          (sourceFilter === 'standard' && isStandard) ||
          (sourceFilter === 'custom' && isCustom) ||
          (sourceFilter === 'cloned' && isCloned);

        return matchesQuery && matchesSource;
      })
      .sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortField === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sortField === 'updated_at') {
          valA = new Date(a.updated_at).getTime();
          valB = new Date(b.updated_at).getTime();
        } else if (sortField === 'total_sections') {
          valA = Number(a.total_sections) || 0;
          valB = Number(b.total_sections) || 0;
        } else if (sortField === 'total_items') {
          valA = Number(a.total_items) || 0;
          valB = Number(b.total_items) || 0;
        } else if (sortField === 'total_comments') {
          valA = Number(a.total_comments) || 0;
          valB = Number(b.total_comments) || 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [templates, searchQuery, sourceFilter, sortField, sortOrder]);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExportXlsx = async (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    setExportingId(template.id);
    try {
      let fullTemplate = template;
      if (!template.sections || template.sections.length === 0) {
        const res = await fetch(`/api/templates/${template.id}`);
        const data = await res.json();
        if (res.ok && data.template) {
          fullTemplate = data.template;
        }
      }
      exportTemplateAsSpectoraXlsx(fullTemplate);
    } finally {
      setExportingId(null);
    }
  };

  const handleExportJson = async (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    setExportingId(template.id);
    try {
      let fullTemplate = template;
      if (!template.sections || template.sections.length === 0) {
        const res = await fetch(`/api/templates/${template.id}`);
        const data = await res.json();
        if (res.ok && data.template) {
          fullTemplate = data.template;
        }
      }
      exportTemplateAsJson(fullTemplate);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" id="template-library-view">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight">
            Template Library
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Standardized residential and commercial inspection templates with verified defect narratives.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onNavigateLanding && (
            <button
              id="btn-library-exit-home"
              onClick={onNavigateLanding}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 border border-slate-300 rounded cursor-pointer transition-all shadow-2xs"
              title="Return to Product Home (Public Page)"
            >
              <Home className="w-3.5 h-3.5 text-orange-600" />
              <span>Exit to Home</span>
            </button>
          )}

          <button
            id="btn-library-import-xlsx"
            onClick={onOpenImport}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Spreadsheet</span>
          </button>

          <button
            id="btn-library-create-template"
            onClick={onOpenCreate}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* 2. Search, Filter & View Controls */}
      <div className="bg-white border border-slate-200 rounded p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-templates"
            type="text"
            placeholder="Search templates by title or scope..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Filter & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Source Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded font-semibold cursor-pointer text-xs ${
                sourceFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Standards ({templates.length})
            </button>
            <button
              onClick={() => setSourceFilter('standard')}
              className={`px-2.5 py-1 rounded font-semibold cursor-pointer text-xs ${
                sourceFilter === 'standard'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standards
            </button>
            <button
              onClick={() => setSourceFilter('custom')}
              className={`px-2.5 py-1 rounded font-semibold cursor-pointer text-xs ${
                sourceFilter === 'custom'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
            <button
              onClick={() => setSourceFilter('cloned')}
              className={`px-2.5 py-1 rounded font-semibold cursor-pointer text-xs ${
                sourceFilter === 'cloned'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clones
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded cursor-pointer ${
                viewMode === 'cards' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded cursor-pointer ${
                viewMode === 'table' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Compact Table View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Templates Listing */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            {templates.length === 0 ? <Upload className="w-6 h-6 text-orange-600" /> : <Layers className="w-6 h-6" />}
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <p className="text-sm font-bold text-slate-900">
              {templates.length === 0 ? 'No Templates in Library' : 'No Matching Templates'}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {templates.length === 0
                ? 'Your library is currently empty. Manually upload your Spectora inspection spreadsheet (.xlsx / .xls) or create a new template to get started.'
                : searchQuery
                ? `No templates matching "${searchQuery}". Try adjusting your search or source filters.`
                : 'No templates match the selected filter.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              id="btn-library-empty-import"
              onClick={onOpenImport}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Spreadsheet (.XLSX)</span>
            </button>
            <button
              id="btn-library-empty-create"
              onClick={onOpenCreate}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Create New Template</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              id={`template-card-${template.id}`}
              className="bg-white border border-slate-200 hover:border-orange-300 rounded p-4 flex flex-col justify-between space-y-3 transition-all shadow-2xs group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      onClick={() => onSelectTemplate(template.id)}
                      className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors cursor-pointer truncate block"
                      title={template.name}
                    >
                      {template.name}
                    </span>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {template.description || 'Standard property inspection template with systems and defect observations.'}
                    </p>
                  </div>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {template.status || 'Active'}
                  </span>
                </div>

                {/* Structural metrics */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                  <div className="p-1 rounded bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">Systems</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {template.total_sections || 0}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">Items</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {template.total_items || 0}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">Narratives</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {template.total_comments || 0}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                  {template.source_type && (
                    <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                      {template.source_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onDuplicateTemplate(template.id)}
                    disabled={isDuplicating === template.id}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    title="Clone into independent copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleExportXlsx(e, template)}
                    disabled={exportingId === template.id}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    title="Export as Excel spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(template)}
                    disabled={isDeleting === template.id}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  id={`btn-open-template-${template.id}`}
                  onClick={() => onSelectTemplate(template.id)}
                  className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer shadow-xs"
                >
                  <span>Open</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* COMPACT TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                <th className="py-2.5 px-4 cursor-pointer" onClick={() => handleSortToggle('name')}>
                  <div className="flex items-center space-x-1">
                    <span>Template Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => handleSortToggle('total_sections')}>
                  <div className="flex items-center justify-center space-x-1">
                    <span>Systems</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => handleSortToggle('total_items')}>
                  <div className="flex items-center justify-center space-x-1">
                    <span>Components</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => handleSortToggle('total_comments')}>
                  <div className="flex items-center justify-center space-x-1">
                    <span>Narratives</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSortToggle('updated_at')}>
                  <div className="flex items-center space-x-1">
                    <span>Last Updated</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTemplates.map((template) => (
                <tr
                  key={template.id}
                  onClick={() => onSelectTemplate(template.id)}
                  className="hover:bg-orange-50/20 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-4">
                    <div className="font-bold text-slate-900">{template.name}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-xs">{template.description || 'Standard template'}</div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700">
                    {template.total_sections || 0}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700">
                    {template.total_items || 0}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700">
                    {template.total_comments || 0}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {template.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                    {new Date(template.updated_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => onDuplicateTemplate(template.id)}
                        disabled={isDuplicating === template.id}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleExportXlsx(e, template)}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="Export Excel"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTemplate(template)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectTemplate(template.id)}
                        className="ml-1 px-2.5 py-1 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded text-[11px]"
                      >
                        Open
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
