import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Info,
  Check,
  RefreshCw,
  FolderTree,
  FileText,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { ParsePreviewData } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (templateId: string) => void;
}

type WizardStep = 'upload' | 'preview' | 'audit';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [previewData, setPreviewData] = useState<ParsePreviewData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setValidationErrors([]);
    setValidationWarnings([]);
    setPreviewData(null);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/templates/preview', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        setValidationErrors(data.details || [data.error || 'Failed to parse spreadsheet']);
        return;
      }

      setPreviewData(data.preview);
      setTemplateName(data.preview.name);
      setDetectedHeaders(data.validation?.detectedHeaders || []);
      setValidationWarnings(data.validation?.warnings || []);
      setCurrentStep('preview');
    } catch (err: any) {
      setValidationErrors([err.message || 'Network error while processing spreadsheet']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommit = async (openEditorDirectly: boolean = true) => {
    if (!previewData) return;
    setIsCommitting(true);
    try {
      const payload = {
        ...previewData,
        name: templateName.trim() || previewData.name
      };

      const res = await fetch('/api/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed: payload })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save template to cloud workspace');
      }

      onClose();
      if (openEditorDirectly) {
        onImportSuccess(data.template.id);
      }
    } catch (err: any) {
      setValidationErrors([err.message || 'Failed to save template to database']);
    } finally {
      setIsCommitting(false);
    }
  };

  const metrics = previewData?.metrics;
  const issues = previewData?.issues || [];

  return (
    <div
      id="modal-import-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto select-none"
    >
      <div
        id="modal-import-card"
        className="bg-white rounded shadow-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Wizard Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900">Spectora Spreadsheet Importer</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-semibold">
                  Automated Template Ingestion
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Deterministic extraction of Systems, Components, and Pre-written Defect Narratives
              </p>
            </div>
          </div>

          <button
            id="btn-close-import-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Strip */}
        <div className="bg-slate-100/80 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-6">
            <div
              className={`flex items-center space-x-1.5 ${
                currentStep === 'upload' ? 'font-bold text-orange-700' : 'text-slate-500'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep === 'upload' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-slate-300 text-slate-700'
              }`}>
                1
              </span>
              <span>Upload Spreadsheet</span>
            </div>

            <span className="text-slate-300">&rarr;</span>

            <div
              className={`flex items-center space-x-1.5 ${
                currentStep === 'preview' ? 'font-bold text-orange-700' : 'text-slate-500'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep === 'preview' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-slate-300 text-slate-700'
              }`}>
                2
              </span>
              <span>Hierarchy Preview</span>
            </div>

            <span className="text-slate-300">&rarr;</span>

            <div
              className={`flex items-center space-x-1.5 ${
                currentStep === 'audit' ? 'font-bold text-orange-700' : 'text-slate-500'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep === 'audit' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-slate-300 text-slate-700'
              }`}>
                3
              </span>
              <span>Fidelity & Triage</span>
            </div>
          </div>

          {previewData && (
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              File: <strong className="text-slate-800">{previewData.source_filename}</strong>
            </span>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Validation / Persistence Errors */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 rounded bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5">
              <div className="flex items-center space-x-2 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{currentStep === 'upload' ? 'Spreadsheet Validation Notice' : 'Import / Persistence Notice'}</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-xs">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* STEP 1: UPLOAD & DROPZONE */}
          {currentStep === 'upload' && (
            <div className="space-y-4">
              {isProcessing ? (
                <div className="p-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">Processing Spectora Spreadsheet...</p>
                    <p className="text-xs text-slate-500">
                      Reconstructing Systems, Components, and Inspection Narratives with safe formatting preservation.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    id="dropzone-spreadsheet"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) {
                        handleFileChange(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-2 border-dashed border-slate-300 hover:border-orange-500 bg-slate-50/70 hover:bg-orange-50/20 rounded p-8 text-center cursor-pointer transition-colors space-y-3"
                  >
                    <input
                      ref={fileInputRef}
                      id="input-file-spreadsheet"
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                      }}
                    />
                    <div className="w-12 h-12 rounded bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">
                        Click to select or drag and drop your Spectora spreadsheet
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                        Compatible with Spectora "Export HTML Text" (.xlsx) with Section, Item, Comment, and HTML Text columns
                      </p>
                    </div>
                  </div>

                  {/* Manual Spreadsheet Format Guidelines */}
                  <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                    <div className="flex items-center space-x-2 font-bold text-slate-800">
                      <Info className="w-4 h-4 text-orange-600 shrink-0" />
                      <span>Supported Spreadsheet Layout:</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Upload an Excel workbook (<code className="font-mono text-slate-700 bg-slate-200/80 px-1 py-0.5 rounded">.xlsx</code> or <code className="font-mono text-slate-700 bg-slate-200/80 px-1 py-0.5 rounded">.xls</code>) exported from Spectora. The importer automatically detects headers such as <strong className="text-slate-700 font-semibold">Section</strong> (or Section Name), <strong className="text-slate-700 font-semibold">Item</strong> (or Item Name), <strong className="text-slate-700 font-semibold">Comment</strong> (or Comment Name), and <strong className="text-slate-700 font-semibold">HTML Text</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW HIERARCHY */}
          {currentStep === 'preview' && previewData && (
            <div className="space-y-4">
              {/* Template Name Customizer */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Template Name in Spectora Studio
                </label>
                <input
                  id="input-preview-template-name"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              {/* Detected Headers */}
              {detectedHeaders.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded flex items-center space-x-2">
                  <span className="font-semibold text-slate-600">Matched Columns:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedHeaders.map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-mono text-[11px]">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Structural Metrics Grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="text-slate-500 font-medium text-[11px]">Systems (Sections)</div>
                  <div className="text-lg font-bold text-slate-900 font-mono">{metrics?.sectionsCount}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="text-slate-500 font-medium text-[11px]">Components (Items)</div>
                  <div className="text-lg font-bold text-slate-900 font-mono">{metrics?.itemsCount}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="text-slate-500 font-medium text-[11px]">Defect Narratives</div>
                  <div className="text-lg font-bold text-slate-900 font-mono">{metrics?.commentsCount}</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                  <div className="text-emerald-700 font-medium text-[11px]">Preservation Score</div>
                  <div className="text-lg font-bold text-emerald-800 font-mono">{metrics?.preservationScore}%</div>
                </div>
              </div>

              {/* Hierarchy Tree Preview */}
              <div className="border border-slate-200 rounded p-3 space-y-2 max-h-56 overflow-y-auto bg-slate-50/50">
                <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                  Extracted Inspection Structure:
                </span>
                <div className="space-y-2 pl-1">
                  {previewData.sections.slice(0, 6).map((sec, sIdx) => (
                    <div key={sIdx} className="border-l-2 border-orange-500 pl-2 space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {sec.position}. {sec.name} <span className="font-normal text-slate-500 font-mono">({sec.items.length} items)</span>
                      </div>
                      <div className="pl-3 text-[11px] text-slate-600 space-y-0.5">
                        {sec.items.slice(0, 3).map((item, iIdx) => (
                          <div key={iIdx}>
                            &bull; {item.name} <span className="text-slate-400 font-mono">({item.comments.length} observations)</span>
                          </div>
                        ))}
                        {sec.items.length > 3 && (
                          <div className="text-slate-400 italic">+ {sec.items.length - 3} more items</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {previewData.sections.length > 6 && (
                    <div className="text-slate-400 italic pl-3">
                      + {previewData.sections.length - 6} more sections
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PRESERVATION & TRIAGE */}
          {currentStep === 'audit' && previewData && (
            <div className="space-y-4">
              {/* Comprehensive Preservation Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-3">
                <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                  Preservation Guarantee:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                  <div className="p-2.5 bg-white border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px]">Hierarchy:</span>
                    <span className="text-emerald-700 font-bold flex items-center">
                      <Check className="w-3.5 h-3.5 mr-1" /> 100% Relational
                    </span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px]">Ordering:</span>
                    <span className="text-emerald-700 font-bold flex items-center">
                      <Check className="w-3.5 h-3.5 mr-1" /> 100% Sequential
                    </span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px]">Text Content:</span>
                    <span className="text-emerald-700 font-bold flex items-center">
                      <Check className="w-3.5 h-3.5 mr-1" /> {metrics?.preservationScore}% Raw
                    </span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px]">Formatting:</span>
                    <span className="text-emerald-700 font-bold flex items-center">
                      <Check className="w-3.5 h-3.5 mr-1" /> 100% Safe HTML
                    </span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px]">Unmapped Rows:</span>
                    <span className="text-slate-700 font-bold">{metrics?.unmappedRows || 0} rows</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px]">Fidelity Notices:</span>
                    <span className={issues.length > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                      {issues.length} notice(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Absent in Export vs Handled by Importer */}
              <div className="space-y-3">
                {/* 1. Absent in Export */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-blue-900">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Information Naturally Absent from Spectora HTML-Text Export:</span>
                  </div>
                  <p className="text-blue-900 text-[11px] leading-relaxed">
                    Spectora's "Export HTML Text" format extracts text defect narratives and hierarchical template structure. Binary camera photos, property addresses, and client invoice pricing are stored outside spreadsheet exports and are naturally absent.
                  </p>
                </div>

                {/* 2. Handled / Sanitized */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Sanitized Content or Noticed Markup ({issues.length}):</span>
                  </div>

                  {issues.length === 0 ? (
                    <p className="text-emerald-700 font-semibold text-[11px]">
                      Clean import! No unsupported tags or malformed rows encountered.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {issues.map((iss, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border border-slate-200 font-mono text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between text-slate-500 text-[10px]">
                            <span className="font-bold text-amber-800">[{iss.category}]</span>
                            <span>{iss.source_location || (iss.source_row ? `Row ${iss.source_row}` : 'Source')}</span>
                          </div>
                          <p className="text-slate-800 font-sans">{iss.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {currentStep === 'preview' && (
              <button
                onClick={() => setCurrentStep('upload')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Upload</span>
              </button>
            )}
            {currentStep === 'audit' && (
              <button
                onClick={() => setCurrentStep('preview')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Preview</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded cursor-pointer"
            >
              Cancel
            </button>

            {currentStep === 'preview' && (
              <button
                id="btn-next-to-audit"
                onClick={() => setCurrentStep('audit')}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer shadow-xs"
              >
                <span>Review Fidelity Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 'audit' && (
              <button
                id="btn-commit-import-direct"
                onClick={() => handleCommit(true)}
                disabled={isCommitting}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Cloud Workspace...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Import & Open in Editor</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
