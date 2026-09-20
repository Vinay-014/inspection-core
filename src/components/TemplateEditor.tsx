import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  FolderTree,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Copy,
  ShieldCheck,
  AlertTriangle,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Search,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Eye,
  RotateCcw,
  Sparkles,
  GitBranch,
  ArrowLeft,
  Columns,
  Download,
  HelpCircle
} from 'lucide-react';
import { Template, Section, Item, Comment, SelectedNodeType } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { exportTemplateAsJson, exportTemplateAsSpectoraXlsx } from '../lib/export';
import DOMPurify from 'dompurify';

interface TemplateEditorProps {
  template: Template;
  onUpdateTemplate: (id: string, updates: { name?: string; description?: string; status?: string }) => Promise<void>;
  onDuplicateTemplate: (id: string) => Promise<void>;
  onDeleteTemplate?: (template: Template) => void;
  onOpenIssues: () => void;
  onOpenAudit: () => void;
  onRefreshTemplate: () => Promise<void>;
  isDuplicatedClone?: boolean;
  selectedNode?: SelectedNodeType;
  onSelectNode?: (node: SelectedNodeType) => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onUpdateTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onOpenIssues,
  onOpenAudit,
  onRefreshTemplate,
  isDuplicatedClone,
  selectedNode: propSelectedNode,
  onSelectNode
}) => {
  const sections = template.sections || [];
  const issues = template.issues || [];

  // Active selection state in hierarchy
  const [internalSelectedNode, setInternalSelectedNode] = useState<SelectedNodeType>(() => {
    if (sections.length > 0) {
      const firstSec = sections[0];
      if (firstSec.items && firstSec.items.length > 0) {
        return { type: 'item', sectionId: firstSec.id, itemId: firstSec.items[0].id };
      }
      return { type: 'section', sectionId: firstSec.id };
    }
    return { type: 'template' };
  });

  const selectedNode = propSelectedNode ?? internalSelectedNode;
  const setSelectedNode = (node: SelectedNodeType) => {
    if (onSelectNode) onSelectNode(node);
    setInternalSelectedNode(node);
  };

  // Search filter for sections & items
  const [sectionSearch, setSectionSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  // Dirty state tracking & save status
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date());
  const [saveError, setSaveError] = useState<string | null>(null);

  // In-app deletion confirm modal
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'template' | 'section' | 'item' | 'comment';
    id: string;
    title: string;
    description: string;
    isLoading?: boolean;
  } | null>(null);

  // Template Form State
  const [templateName, setTemplateName] = useState(template.name);
  const [templateDesc, setTemplateDesc] = useState(template.description || '');
  const [templateStatus, setTemplateStatus] = useState(template.status || 'active');

  // Section Editing State
  const [sectionName, setSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);

  // Item Editing State
  const [itemName, setItemName] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Comment Editing State
  const [commentHtml, setCommentHtml] = useState('');
  const [editorMode, setEditorMode] = useState<'visual' | 'code' | 'split'>('split');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentHtml, setNewCommentHtml] = useState('');

  // Derive active section, item, comment
  const activeSection = sections.find(
    s => 'sectionId' in selectedNode && s.id === selectedNode.sectionId
  ) || sections[0];

  const activeItem = activeSection?.items?.find(
    i => 'itemId' in selectedNode && i.id === selectedNode.itemId
  ) || activeSection?.items?.[0];

  const activeComment = activeItem?.comments?.find(
    c => 'commentId' in selectedNode && c.id === selectedNode.commentId
  );

  // Synchronize inputs when selectedNode changes
  useEffect(() => {
    setTemplateName(template.name);
    setTemplateDesc(template.description || '');
    setTemplateStatus(template.status || 'active');
  }, [template]);

  useEffect(() => {
    if (activeSection) {
      setSectionName(activeSection.name);
    }
  }, [activeSection?.id, activeSection?.name]);

  useEffect(() => {
    if (activeItem) {
      setItemName(activeItem.name);
    }
  }, [activeItem?.id, activeItem?.name]);

  useEffect(() => {
    if (activeComment) {
      setCommentHtml(activeComment.content_html || activeComment.source_content_html || '');
      setIsDirty(false);
    } else {
      setCommentHtml('');
    }
  }, [activeComment?.id, activeComment?.content_html]);

  // Keyboard shortcut for saving (Ctrl+S or Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleGenericSaveNow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // --- SAVE HANDLERS ---

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onUpdateTemplate(template.id, {
        name: templateName.trim(),
        description: templateDesc.trim(),
        status: templateStatus
      });
      setIsDirty(false);
      setLastSavedAt(new Date());
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSection = async (secId?: string, overrideName?: string) => {
    const targetId = secId || activeSection?.id;
    const targetName = overrideName !== undefined ? overrideName : sectionName;
    if (!targetId || !targetName.trim()) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/sections/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: targetName.trim() })
      });
      if (!res.ok) throw new Error('Failed to update section name');
      await onRefreshTemplate();
      setEditingSectionId(null);
      setIsDirty(false);
      setLastSavedAt(new Date());
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveItem = async (itmId?: string, overrideName?: string) => {
    const targetId = itmId || activeItem?.id;
    const targetName = overrideName !== undefined ? overrideName : itemName;
    if (!targetId || !targetName.trim()) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/items/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: targetName.trim() })
      });
      if (!res.ok) throw new Error('Failed to update item name');
      await onRefreshTemplate();
      setEditingItemId(null);
      setIsDirty(false);
      setLastSavedAt(new Date());
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveComment = async () => {
    if (!activeComment) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/comments/${activeComment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_html: commentHtml })
      });
      if (!res.ok) throw new Error('Failed to update observation narrative');
      await onRefreshTemplate();
      setIsDirty(false);
      setLastSavedAt(new Date());
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save comment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenericSaveNow = () => {
    if (selectedNode.type === 'template') handleSaveTemplate();
    else if (selectedNode.type === 'section') handleSaveSection();
    else if (selectedNode.type === 'item') handleSaveItem();
    else if (selectedNode.type === 'comment') handleSaveComment();
  };

  // --- CREATION HANDLERS ---

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          name: newSectionName.trim()
        })
      });
      if (!res.ok) throw new Error('Failed to create section');
      const data = await res.json();
      setNewSectionName('');
      setIsAddingSection(false);
      await onRefreshTemplate();
      if (data.section?.id) {
        setSelectedNode({ type: 'section', sectionId: data.section.id });
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to create section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateItem = async () => {
    if (!newItemName.trim() || !activeSection) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: activeSection.id,
          name: newItemName.trim()
        })
      });
      if (!res.ok) throw new Error('Failed to create item');
      const data = await res.json();
      setNewItemName('');
      setIsAddingItem(false);
      await onRefreshTemplate();
      if (data.item?.id) {
        setSelectedNode({ type: 'item', sectionId: activeSection.id, itemId: data.item.id });
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to create item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateComment = async () => {
    if (!newCommentHtml.trim() || !activeSection || !activeItem) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: activeItem.id,
          content_html: newCommentHtml.trim()
        })
      });
      if (!res.ok) throw new Error('Failed to create observation comment');
      const data = await res.json();
      setNewCommentHtml('');
      setIsAddingComment(false);
      await onRefreshTemplate();
      if (data.comment?.id) {
        setSelectedNode({
          type: 'comment',
          sectionId: activeSection.id,
          itemId: activeItem.id,
          commentId: data.comment.id
        });
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to create observation');
    } finally {
      setIsSaving(false);
    }
  };

  // --- DELETE CONFIRMATION HANDLER ---

  const handleConfirmModalDelete = async () => {
    if (!deleteModalState) return;
    setDeleteModalState(prev => (prev ? { ...prev, isLoading: true } : null));
    try {
      if (deleteModalState.type === 'section') {
        await fetch(`/api/sections/${deleteModalState.id}`, { method: 'DELETE' });
        await onRefreshTemplate();
        setSelectedNode({ type: 'template' });
      } else if (deleteModalState.type === 'item') {
        await fetch(`/api/items/${deleteModalState.id}`, { method: 'DELETE' });
        await onRefreshTemplate();
        if (activeSection) {
          setSelectedNode({ type: 'section', sectionId: activeSection.id });
        }
      } else if (deleteModalState.type === 'comment') {
        await fetch(`/api/comments/${deleteModalState.id}`, { method: 'DELETE' });
        await onRefreshTemplate();
        if (activeSection && activeItem) {
          setSelectedNode({ type: 'item', sectionId: activeSection.id, itemId: activeItem.id });
        }
      }
      setDeleteModalState(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleteModalState(prev => (prev ? { ...prev, isLoading: false } : null));
    }
  };

  // --- FORMATTING TOOLBAR HELPERS ---
  const applyFormatting = (tag: 'strong' | 'em' | 'u' | 's' | 'ul' | 'ol' | 'a') => {
    const textarea = document.getElementById('comment-editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = commentHtml.substring(start, end) || 'text';

    let replacement = '';
    if (tag === 'strong') replacement = `<strong>${selected}</strong>`;
    else if (tag === 'em') replacement = `<em>${selected}</em>`;
    else if (tag === 'u') replacement = `<u>${selected}</u>`;
    else if (tag === 's') replacement = `<s>${selected}</s>`;
    else if (tag === 'ul') replacement = `<ul><li>${selected}</li></ul>`;
    else if (tag === 'ol') replacement = `<ol><li>${selected}</li></ol>`;
    else if (tag === 'a') replacement = `<a href="https://">${selected}</a>`;

    const nextVal = commentHtml.substring(0, start) + replacement + commentHtml.substring(end);
    setCommentHtml(nextVal);
    setIsDirty(true);
  };

  // Classification styling helper
  const getCategoryBadge = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('hazard') || lower.includes('safety') || lower.includes('danger')) {
      return <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">Safety Hazard</span>;
    }
    if (lower.includes('defect') || lower.includes('damage') || lower.includes('repair') || lower.includes('leak')) {
      return <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">Defect</span>;
    }
    if (lower.includes('maintain') || lower.includes('service') || lower.includes('clean')) {
      return <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">Maintenance</span>;
    }
    return <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">Information</span>;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.25rem)] bg-slate-100 select-none" id="template-editor-root">
      {/* 1. TOP SUBHEADER TOOLBAR */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-7 h-7 rounded bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <input
                id="template-name-input"
                type="text"
                value={templateName}
                onChange={(e) => {
                  setTemplateName(e.target.value);
                  setIsDirty(true);
                }}
                onBlur={handleSaveTemplate}
                className="font-bold text-slate-900 text-sm bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 rounded px-1 -ml-1 truncate max-w-sm sm:max-w-md"
                title="Click to rename template"
              />
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                100% Fidelity
              </span>
              {isDuplicatedClone && (
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                  Clone Copy
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {template.source_filename ? `Source: ${template.source_filename}` : 'Spectora inspection standard'} &bull; {sections.length} systems &bull; {template.total_items} items &bull; {template.total_comments} pre-written comments
            </p>
          </div>
        </div>

        {/* Global Editor Toolbar Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => exportTemplateAsSpectoraXlsx(template)}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
            title="Export full template as Spectora .xlsx"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export .XLSX</span>
          </button>

          <button
            onClick={() => onDuplicateTemplate(template.id)}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
            title="Duplicate entire template into new independent copy"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Clone</span>
          </button>

          <button
            onClick={onOpenAudit}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
            title="Open Data Preservation & Cryptographic Audit"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Audit</span>
          </button>

          <button
            onClick={handleGenericSaveNow}
            disabled={!isDirty || isSaving}
            className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* 2. THE 3-COLUMN INSPECTION WORKBENCH */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUMN 1: INSPECTION SYSTEMS & SECTIONS (Left ~280px) */}
        <div className="w-68 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <FolderTree className="w-4 h-4 text-orange-600" />
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Systems ({sections.length})
              </span>
            </div>
            <button
              id="btn-add-section"
              onClick={() => setIsAddingSection(true)}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded cursor-pointer"
              title="Add Inspection Section"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Inline Add Section Form */}
          {isAddingSection && (
            <div className="p-2.5 bg-orange-50/90 border-b border-orange-200 space-y-2 text-xs">
              <span className="font-bold text-orange-950 block text-[11px]">New Inspection System</span>
              <input
                id="input-new-section-name"
                type="text"
                placeholder="e.g. Electrical System"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSection();
                  if (e.key === 'Escape') setIsAddingSection(false);
                }}
              />
              <div className="flex justify-end space-x-1">
                <button
                  onClick={() => setIsAddingSection(false)}
                  className="px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSection}
                  className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded cursor-pointer"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Section Search Filter */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter systems..."
                value={sectionSearch}
                onChange={(e) => setSectionSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Sections List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
            {sections
              .filter(s => !sectionSearch || s.name.toLowerCase().includes(sectionSearch.toLowerCase()))
              .map((section, idx) => {
                const isSelected = activeSection?.id === section.id;
                const isEditing = editingSectionId === section.id;

                return (
                  <div
                    key={section.id}
                    onClick={() => {
                      setSelectedNode({ type: 'section', sectionId: section.id });
                    }}
                    className={`p-2.5 flex items-center justify-between cursor-pointer group transition-colors ${
                      isSelected
                        ? 'bg-orange-50 text-orange-950 font-bold border-l-3 border-orange-600'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1 mr-1">
                      <span className="text-[10px] text-slate-400 font-mono w-4 shrink-0">
                        {idx + 1}.
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          defaultValue={section.name}
                          onBlur={(e) => handleSaveSection(section.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSection(section.id, (e.target as any).value);
                            if (e.key === 'Escape') setEditingSectionId(null);
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          className="px-1 py-0.5 text-xs bg-white border border-orange-400 rounded w-full"
                        />
                      ) : (
                        <span className="truncate text-xs">{section.name}</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {section.items?.length || 0}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSectionId(section.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-800 rounded"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModalState({
                            isOpen: true,
                            type: 'section',
                            id: section.id,
                            title: `Delete System "${section.name}"?`,
                            description: `This will permanently remove section "${section.name}" and all of its ${section.items?.length || 0} items from Supabase.`
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* COLUMN 2: COMPONENTS & ITEMS (Middle ~300px) */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 min-w-0">
              <FileSpreadsheet className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider truncate">
                {activeSection ? activeSection.name : 'Components'} ({activeSection?.items?.length || 0})
              </span>
            </div>
            {activeSection && (
              <button
                id="btn-add-item"
                onClick={() => setIsAddingItem(true)}
                className="p-1 text-orange-700 hover:bg-orange-100 rounded cursor-pointer shrink-0"
                title="Add Inspection Item to this Section"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Inline Add Item Form */}
          {isAddingItem && activeSection && (
            <div className="p-2.5 bg-orange-50/90 border-b border-orange-200 space-y-2 text-xs">
              <span className="font-bold text-orange-950 block text-[11px]">New Component in {activeSection.name}</span>
              <input
                id="input-new-item-name"
                type="text"
                placeholder="e.g. Main Service Panel"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateItem();
                  if (e.key === 'Escape') setIsAddingItem(false);
                }}
              />
              <div className="flex justify-end space-x-1">
                <button
                  onClick={() => setIsAddingItem(false)}
                  className="px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateItem}
                  className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded cursor-pointer"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Item Search Filter */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter components..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
            {!activeSection ? (
              <p className="p-4 text-xs text-slate-400 text-center">Select an inspection system</p>
            ) : activeSection.items?.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <p className="text-xs">No components in this section.</p>
                <button
                  onClick={() => setIsAddingItem(true)}
                  className="px-3 py-1 text-xs font-bold text-orange-600 bg-orange-50 rounded hover:bg-orange-100 cursor-pointer"
                >
                  + Add Component
                </button>
              </div>
            ) : (
              activeSection.items
                ?.filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()))
                .map((item, idx) => {
                  const isSelected = activeItem?.id === item.id;
                  const isEditing = editingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedNode({
                          type: 'item',
                          sectionId: activeSection.id,
                          itemId: item.id
                        });
                      }}
                      className={`p-2.5 flex items-center justify-between cursor-pointer group transition-colors ${
                        isSelected
                          ? 'bg-orange-50 text-orange-950 font-bold border-l-3 border-orange-600'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1 mr-1">
                        <span className="text-[10px] text-slate-400 font-mono w-4 shrink-0">
                          {idx + 1}.
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            defaultValue={item.name}
                            onBlur={(e) => handleSaveItem(item.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveItem(item.id, (e.target as any).value);
                              if (e.key === 'Escape') setEditingItemId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="px-1 py-0.5 text-xs bg-white border border-orange-400 rounded w-full"
                          />
                        ) : (
                          <span className="truncate text-xs">{item.name}</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.comments?.length || 0}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItemId(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-800 rounded"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalState({
                              isOpen: true,
                              type: 'item',
                              id: item.id,
                              title: `Delete Item "${item.name}"?`,
                              description: `This will permanently delete item "${item.name}" and all of its ${item.comments?.length || 0} observation narratives.`
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* COLUMN 3: OBSERVATION NARRATIVES & DEFECT STUDIO (Main flexible area) */}
        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
          {/* Item / Comment Subheader */}
          <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-slate-500">{activeSection?.name || 'Section'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-900">{activeItem?.name || 'Select a Component'}</span>
              {activeComment && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-orange-600">Active Observation</span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="btn-add-observation"
                onClick={() => setIsAddingComment(true)}
                disabled={!activeItem}
                className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Observation</span>
              </button>
            </div>
          </div>

          {/* Inline Add Observation Form */}
          {isAddingComment && (
            <div className="p-4 bg-orange-50/90 border-b border-orange-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-950 text-xs">New Pre-written Observation Narrative</span>
                <span className="text-[11px] text-orange-800">Rich HTML supported</span>
              </div>
              <textarea
                id="textarea-new-comment"
                rows={3}
                placeholder="Enter narrative text (e.g. <strong>GFCI Protection Missing</strong>: No GFCI reset capability found at master bath.)"
                value={newCommentHtml}
                onChange={(e) => setNewCommentHtml(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-orange-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsAddingComment(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateComment}
                  className="px-3 py-1 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded cursor-pointer"
                >
                  Create Observation
                </button>
              </div>
            </div>
          )}

          {/* Workbench Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {!activeItem ? (
              <div className="bg-white border border-slate-200 rounded p-12 text-center text-slate-400 space-y-2">
                <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No Component Selected</p>
                <p className="text-xs text-slate-400">Choose an inspection system and component from the columns on the left.</p>
              </div>
            ) : selectedNode.type === 'comment' && activeComment ? (
              /* DEEP ACTIVE OBSERVATION STUDIO */
              <div className="space-y-4">
                {/* Back to All Item Observations */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (activeSection && activeItem) {
                        setSelectedNode({ type: 'item', sectionId: activeSection.id, itemId: activeItem.id });
                      }
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-orange-600 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to all observations for "{activeItem.name}"</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setDeleteModalState({
                          isOpen: true,
                          type: 'comment',
                          id: activeComment.id,
                          title: 'Delete Observation?',
                          description: 'This will permanently remove this pre-written observation narrative from the database.'
                        })
                      }
                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      onClick={handleSaveComment}
                      disabled={!isDirty || isSaving}
                      className="px-3 py-1 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded cursor-pointer disabled:opacity-40"
                    >
                      {isSaving ? 'Saving...' : 'Save Narrative'}
                    </button>
                  </div>
                </div>

                {/* Editor Card */}
                <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
                  {/* Toolbar */}
                  <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => applyFormatting('strong')}
                        className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyFormatting('em')}
                        className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyFormatting('u')}
                        className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Underline"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyFormatting('s')}
                        className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Strikethrough"
                      >
                        <Strikethrough className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-4 bg-slate-300 mx-1" />
                      <button
                        onClick={() => applyFormatting('ul')}
                        className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Bullet List"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyFormatting('ol')}
                        className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Numbered List"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyFormatting('a')}
                        className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                        title="Insert Link"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Mode Toggle (Visual vs Code vs Split) */}
                    <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded text-[11px] font-semibold">
                      <button
                        onClick={() => setEditorMode('visual')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          editorMode === 'visual' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                        }`}
                      >
                        Visual
                      </button>
                      <button
                        onClick={() => setEditorMode('code')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          editorMode === 'code' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                        }`}
                      >
                        Raw HTML
                      </button>
                      <button
                        onClick={() => setEditorMode('split')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          editorMode === 'split' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                        }`}
                      >
                        Split View
                      </button>
                    </div>
                  </div>

                  {/* Editing Canvas */}
                  <div className="p-4">
                    {editorMode === 'split' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            HTML Source Editor
                          </label>
                          <textarea
                            id="comment-editor-textarea"
                            rows={8}
                            value={commentHtml}
                            onChange={(e) => {
                              setCommentHtml(e.target.value);
                              setIsDirty(true);
                            }}
                            className="w-full p-3 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 leading-relaxed"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Customer Report Preview (Sanitized)
                          </label>
                          <div
                            className="w-full h-[184px] p-3 text-xs text-slate-800 bg-white border border-slate-200 rounded overflow-y-auto prose prose-xs max-w-none leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(commentHtml)
                            }}
                          />
                        </div>
                      </div>
                    ) : editorMode === 'code' ? (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Raw HTML Markup
                        </label>
                        <textarea
                          id="comment-editor-textarea"
                          rows={10}
                          value={commentHtml}
                          onChange={(e) => {
                            setCommentHtml(e.target.value);
                            setIsDirty(true);
                          }}
                          className="w-full p-3 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Formatted Customer View
                        </label>
                        <div
                          className="w-full min-h-[160px] p-4 text-xs text-slate-800 bg-white border border-slate-200 rounded prose prose-xs max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(commentHtml)
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Provenance Strip */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center space-x-3">
                      <span>Row in Source: {activeComment.source_row ? `#${activeComment.source_row}` : 'N/A'}</span>
                      <span>DOMPurify: Sanitized Safe</span>
                      {activeComment.has_unsupported_tags && (
                        <span className="text-amber-700 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Sanitized tags: {activeComment.unsupported_tags?.join(', ')}</span>
                        </span>
                      )}
                    </div>

                    {activeComment.source_content_html && (
                      <button
                        onClick={() => {
                          setCommentHtml(activeComment.source_content_html || '');
                          setIsDirty(true);
                        }}
                        className="text-orange-600 hover:underline font-semibold cursor-pointer"
                      >
                        Revert to Original Source HTML
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* OBSERVATIONS LIST FOR ACTIVE COMPONENT */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Pre-Written Observation Narratives ({activeItem.comments?.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Click any observation to open in rich text studio
                  </span>
                </div>

                {activeItem.comments?.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded p-8 text-center text-slate-400 space-y-2">
                    <FileText className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No Observation Comments Recorded</p>
                    <p className="text-xs text-slate-400">
                      Add a new defect or maintenance observation narrative to this component.
                    </p>
                    <button
                      onClick={() => setIsAddingComment(true)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded cursor-pointer inline-flex items-center space-x-1 mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Observation</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeItem.comments?.map((cmt, idx) => (
                      <div
                        key={cmt.id}
                        onClick={() => {
                          if (activeSection && activeItem) {
                            setSelectedNode({
                              type: 'comment',
                              sectionId: activeSection.id,
                              itemId: activeItem.id,
                              commentId: cmt.id
                            });
                          }
                        }}
                        className="bg-white border border-slate-200 hover:border-orange-400 rounded p-4 cursor-pointer transition-all shadow-2xs group space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900">
                              Observation #{idx + 1}
                            </span>
                            {getCategoryBadge(cmt.content_html)}
                          </div>

                          <div className="flex items-center space-x-2 text-xs">
                            {cmt.source_row && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Row {cmt.source_row}
                              </span>
                            )}
                            <span className="text-orange-600 font-bold group-hover:underline text-[11px]">
                              Edit &rarr;
                            </span>
                          </div>
                        </div>

                        <div
                          className="text-xs text-slate-700 line-clamp-3 prose prose-xs max-w-none leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(cmt.content_html)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-app Deletion Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteModalState?.isOpen}
        title={deleteModalState?.title || 'Confirm Deletion'}
        description={deleteModalState?.description || 'Are you sure you want to delete this entity?'}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={deleteModalState?.isLoading}
        onConfirm={handleConfirmModalDelete}
        onClose={() => setDeleteModalState(null)}
      />
    </div>
  );
};
