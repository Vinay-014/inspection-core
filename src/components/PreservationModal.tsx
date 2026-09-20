import React from 'react';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, Info, Hash, FileSpreadsheet, Lock, Check } from 'lucide-react';
import { Template } from '../types';

interface PreservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
}

export const PreservationModal: React.FC<PreservationModalProps> = ({
  isOpen,
  onClose,
  template
}) => {
  if (!isOpen || !template) return null;

  const score = Number(template.preservation_score) || 100;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto select-none"
      id="preservation-modal-backdrop"
    >
      <div
        className="bg-white rounded shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        id="preservation-modal-card"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-orange-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Data Preservation & Fidelity Audit</h3>
              <p className="text-xs text-slate-500">{template.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Top Score Box */}
          <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Deterministic Ingestion Standard</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Data Preservation Guarantee</h4>
              <p className="text-slate-600 max-w-md text-xs">
                All structural systems, components, and rich text narratives are extracted into relational records without opaque single-blob storage.
              </p>
            </div>
            <div className="text-center bg-white px-5 py-3 rounded border border-slate-200 shadow-2xs shrink-0">
              <span className="text-3xl font-extrabold text-emerald-700 font-mono">{score}%</span>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fidelity Score</span>
            </div>
          </div>

          {/* Cryptographic Identification */}
          <div className="border border-slate-200 rounded p-4 space-y-2.5 bg-slate-50/50">
            <div className="flex items-center space-x-2 text-slate-800 font-bold">
              <Hash className="w-4 h-4 text-orange-600" />
              <span>Database Identifiers & Provenance</span>
            </div>
            <div className="space-y-2 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Database Primary Key UUID:</span>
                <span className="text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 block truncate select-all">
                  {template.id}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Source Spreadsheet Specification:</span>
                <span className="text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 block">
                  {template.source_type} ({template.source_filename || 'Direct spreadsheet'})
                </span>
              </div>
            </div>
          </div>

          {/* Differentiating Absent vs Unsupported */}
          <div className="space-y-3">
            <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Transparency: Source Export Absences vs Importer Handling
            </h5>

            {/* 1. Absent from Source */}
            <div className="p-3.5 rounded bg-blue-50/70 border border-blue-200 space-y-1.5">
              <div className="flex items-center space-x-2 font-bold text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Information Naturally Absent from Spectora HTML-Text Exports:</span>
              </div>
              <p className="text-blue-900 leading-relaxed text-[11px]">
                Spectora's "Export HTML Text" exports observation text and template hierarchy only. Media files (inspection photos/videos), client billing pricing, thermal infrared imaging, and physical job addresses reside in separate modules and are never included in spreadsheet templates.
              </p>
            </div>

            {/* 2. Supported Rich HTML */}
            <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Supported & Preserved Rich-Text Elements:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700 text-[11px]">
                <div>• Bold (&lt;strong&gt;, &lt;b&gt;) & Italic (&lt;em&gt;, &lt;i&gt;)</div>
                <div>• Unordered Lists (&lt;ul&gt;, &lt;li&gt;)</div>
                <div>• Ordered / Numbered Lists (&lt;ol&gt;, &lt;li&gt;)</div>
                <div>• Paragraphs & Linebreaks (&lt;p&gt;, &lt;br&gt;)</div>
                <div>• Hyperlinks (&lt;a href="..."&gt;)</div>
                <div>• DOMPurify XSS Sanitization</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
