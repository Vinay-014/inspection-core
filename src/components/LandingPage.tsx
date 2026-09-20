import React, { useState } from 'react';
import {
  Building,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Upload,
  Copy,
  FileText,
  Sliders,
  Eye,
  Zap,
  Droplet,
  Flame,
  Home,
  Wrench,
  Check,
  FileSpreadsheet,
  ChevronRight,
  AlertTriangle,
  Clock,
  Database,
  Lock,
  Compass,
  FileCheck,
  Menu,
  X
} from 'lucide-react';
import { Template } from '../types';

interface LandingPageProps {
  templates: Template[];
  onEnterApp: () => void;
  onExploreTemplates: () => void;
  onOpenImport: () => void;
  onSelectTemplate: (id: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  templates,
  onEnterApp,
  onExploreTemplates,
  onOpenImport,
  onSelectTemplate
}) => {
  // Interactive preview state for the hero product mockup
  const [selectedPreviewSystem, setSelectedPreviewSystem] = useState<number>(2); // Electrical by default
  const [previewMode, setPreviewMode] = useState<'inspector' | 'client'>('inspector');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [previewMobileTab, setPreviewMobileTab] = useState<'systems' | 'items' | 'narrative'>('systems');

  // Preview data modeling a real inspection workflow
  const previewSystems = [
    { id: 0, name: 'Roofing & Attics', icon: Home, items: 3, defects: 4, badge: 'Standard SOP' },
    { id: 1, name: 'Exterior Envelope', icon: Compass, items: 3, defects: 3, badge: 'Standard SOP' },
    { id: 2, name: 'Electrical Service', icon: Zap, items: 2, defects: 4, badge: 'High Priority' },
    { id: 3, name: 'Heating & Cooling (HVAC)', icon: Flame, items: 2, defects: 2, badge: 'Mechanical' },
    { id: 4, name: 'Plumbing Systems', icon: Droplet, items: 3, defects: 3, badge: 'Standard SOP' },
    { id: 5, name: 'Interior Living Areas', icon: Wrench, items: 4, defects: 4, badge: 'Standard SOP' },
  ];

  const previewItems: Record<number, Array<{ name: string; status: string; commentCount: number }>> = {
    0: [
      { name: 'Roof Coverings & Flashing', status: 'Inspected', commentCount: 2 },
      { name: 'Roof Drainage & Gutters', status: 'Inspected', commentCount: 1 },
      { name: 'Attic Insulation & Ventilation', status: 'Defect Noted', commentCount: 1 }
    ],
    1: [
      { name: 'Wall Cladding, Flashing & Trim', status: 'Inspected', commentCount: 1 },
      { name: 'Exterior Doors & Windows', status: 'Inspected', commentCount: 1 },
      { name: 'Walkways, Patios & Driveways', status: 'Defect Noted', commentCount: 1 }
    ],
    2: [
      { name: 'Service Entrance & Main 200A Panel', status: 'Inspected', commentCount: 2 },
      { name: 'Branch Wiring & GFCI/AFCI Receptacles', status: 'Defect Noted', commentCount: 2 }
    ],
    3: [
      { name: 'Heating Equipment (Forced Air Gas)', status: 'Inspected', commentCount: 1 },
      { name: 'Cooling Equipment (Condensing Unit)', status: 'Inspected', commentCount: 1 }
    ],
    4: [
      { name: 'Main Water Supply & Shutoff', status: 'Inspected', commentCount: 1 },
      { name: 'Water Heating Equipment (50 Gal Gas)', status: 'Inspected', commentCount: 1 },
      { name: 'Drain, Waste & Vent Lines', status: 'Inspected', commentCount: 1 }
    ],
    5: [
      { name: 'Walls, Ceilings & Floors', status: 'Inspected', commentCount: 1 },
      { name: 'Doors & Windows Hardware', status: 'Inspected', commentCount: 1 },
      { name: 'Smoke & Carbon Monoxide Alarms', status: 'Inspected', commentCount: 1 },
      { name: 'Gas Fireplace Operation', status: 'Observation', commentCount: 1 }
    ]
  };

  const previewActiveItems = previewItems[selectedPreviewSystem] || previewItems[2];

  // Target template for launch
  const primaryTemplate = templates.length > 0 ? templates[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-orange-600 selection:text-white flex flex-col">
      {/* 1. Header / Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer min-w-0" onClick={onEnterApp} id="brand-logo-nav">
            <div className="w-9 h-9 rounded bg-orange-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 truncate">
                  Inspection<span className="text-orange-600">Core</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide shrink-0">Pro</span>
              </div>
              <p className="text-[10px] text-slate-600 font-medium -mt-0.5 truncate hidden xs:block sm:block">Commercial & Residential Inspection Platform</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8 text-sm font-semibold text-slate-600">
            <a href="#why-inspectioncore" className="hover:text-orange-600 transition-colors">Why InspectionCore</a>
            <a href="#template-engine" className="hover:text-orange-600 transition-colors">Template Engine</a>
            <a href="#defect-narratives" className="hover:text-orange-600 transition-colors">Defect Narratives</a>
            <a href="#migration" className="hover:text-orange-600 transition-colors">Spreadsheet Migration</a>
            <a href="#workflow" className="hover:text-orange-600 transition-colors">Workflow</a>
          </nav>

          {/* Header Action Buttons & Mobile Hamburger */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              id="btn-nav-explore-templates"
              onClick={onExploreTemplates}
              className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 rounded border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Explore Templates</span>
            </button>
            <button
              id="btn-nav-launch-app"
              onClick={onEnterApp}
              className="inline-flex items-center space-x-1.5 sm:space-x-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 px-3 sm:px-4 py-2 rounded shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              id="btn-landing-mobile-menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg">
            <nav className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <a
                href="#why-inspectioncore"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                Why InspectionCore
              </a>
              <a
                href="#template-engine"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                Template Engine
              </a>
              <a
                href="#defect-narratives"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                Defect Narratives
              </a>
              <a
                href="#migration"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                Spreadsheet Migration
              </a>
              <a
                href="#workflow"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                Workflow
              </a>
            </nav>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onExploreTemplates();
                }}
                className="w-full py-2.5 px-3 rounded text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 flex items-center justify-center space-x-2"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Explore Template Library</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenImport();
                }}
                className="w-full py-2.5 px-3 rounded text-xs font-bold text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200 flex items-center justify-center space-x-2"
              >
                <Upload className="w-4 h-4 text-orange-600" />
                <span>Migrate Spreadsheet (.xlsx)</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section - Optically Centered & Responsive */}
      <section className="relative overflow-hidden pt-10 pb-14 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-24 border-b border-slate-200 bg-linear-to-b from-white via-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto space-y-5 sm:space-y-6 flex flex-col items-center justify-center">
            {/* Positioning Pill */}
            <div className="inline-flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200 shadow-2xs text-center">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 shrink-0" />
              <span>Built for Modern Home & Commercial Property Inspectors</span>
            </div>

            {/* Main Headline - Balanced, Responsive & Perfectly Aligned */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight text-slate-900 leading-[1.18] sm:leading-[1.12] text-balance max-w-4xl lg:max-w-5xl mx-auto text-center">
              Inspection reporting & template management,{' '}
              <span className="text-orange-600 underline decoration-orange-300 underline-offset-6">
                engineered for speed
              </span>.
            </h1>

            {/* Subhead / Value Proposition */}
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed text-balance text-center">
              Standardize your property audits, migrate legacy spreadsheets with zero data loss, and deliver crystal-clear defect narratives your clients, real estate agents, and insurers trust.
            </p>

            {/* Primary Action Buttons (Responsive Grid/Row) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 pt-2 w-full sm:w-auto">
              <button
                id="hero-cta-launch-workspace"
                onClick={onEnterApp}
                className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer min-h-[44px]"
              >
                <span>Launch Inspector Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="hero-cta-explore-templates"
                onClick={onExploreTemplates}
                className="inline-flex items-center justify-center space-x-2 px-5 py-3.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer min-h-[44px]"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Explore Template Library</span>
              </button>

              <button
                id="hero-cta-import-sheet"
                onClick={onOpenImport}
                className="inline-flex items-center justify-center space-x-2 px-5 py-3.5 text-sm font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100/80 border border-orange-200 rounded-lg transition-colors cursor-pointer min-h-[44px]"
              >
                <Upload className="w-4 h-4 text-orange-600" />
                <span>Migrate Spreadsheet (.xlsx)</span>
              </button>
            </div>

            {/* Trust Pillars */}
            <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs font-semibold text-slate-600 border-t border-slate-200 w-full max-w-4xl mx-auto">
              <div className="flex items-center justify-center space-x-1.5 py-1 text-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Lossless Hierarchy</span>
              </div>
              <div className="flex items-center justify-center space-x-1.5 py-1 text-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Standard SOP Taxonomy</span>
              </div>
              <div className="flex items-center justify-center space-x-1.5 py-1 text-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Independent Atomic Clones</span>
              </div>
              <div className="flex items-center justify-center space-x-1.5 py-1 text-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant Cloud Sync & Auto-Save</span>
              </div>
            </div>
          </div>

          {/* Interactive Live Software Preview Canvas */}
          <div className="mt-12 lg:mt-16 max-w-6xl mx-auto">
            <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 overflow-hidden text-slate-100">
              {/* Mock App Window Header */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="h-4 w-px bg-slate-800" />
                  <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                    <Building className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-semibold text-slate-200">
                      {primaryTemplate ? primaryTemplate.name : 'Interactive Inspection Studio (Live Sandbox)'}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-emerald-400 font-medium">3-Tier Hierarchy Active</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-slate-800 rounded p-0.5 text-[11px] font-semibold">
                    <button
                      onClick={() => setPreviewMode('inspector')}
                      className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                        previewMode === 'inspector' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Inspector Studio
                    </button>
                    <button
                      onClick={() => setPreviewMode('client')}
                      className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                        previewMode === 'client' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Client Report Output
                    </button>
                  </div>
                  {primaryTemplate ? (
                    <button
                      id="hero-preview-open-template"
                      onClick={() => onSelectTemplate(primaryTemplate.id)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition-colors cursor-pointer"
                    >
                      <span>Open in Editor</span>
                      <ArrowRight className="w-3 h-3 text-orange-400" />
                    </button>
                  ) : (
                    <button
                      onClick={onEnterApp}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition-colors cursor-pointer"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3 h-3 text-orange-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Tab Switcher for Preview Canvas */}
              <div className="flex md:hidden border-b border-slate-800 bg-slate-950 p-1.5 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMobileTab('systems')}
                  className={`flex-1 py-1.5 px-2 rounded text-center font-semibold text-xs transition-colors cursor-pointer ${
                    previewMobileTab === 'systems' ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  1. Systems
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMobileTab('items')}
                  className={`flex-1 py-1.5 px-2 rounded text-center font-semibold text-xs transition-colors cursor-pointer ${
                    previewMobileTab === 'items' ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  2. Checkpoints
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMobileTab('narrative')}
                  className={`flex-1 py-1.5 px-2 rounded text-center font-semibold text-xs transition-colors cursor-pointer ${
                    previewMobileTab === 'narrative' ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  3. Narrative
                </button>
              </div>

              {/* Mock App 3-Column Studio Interface */}
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px] bg-slate-900">
                {/* Column 1: Inspection Systems (Width: 4 cols on desktop) */}
                <div className={`${previewMobileTab === 'systems' ? 'block' : 'hidden'} md:block md:col-span-4 border-b md:border-b-0 md:border-r border-slate-800 p-3 bg-slate-950/40`}>
                  <div className="flex items-center justify-between px-2 py-1 mb-2 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                    <span>Inspection Systems</span>
                    <span className="font-mono text-orange-400">6 Systems</span>
                  </div>
                  <div className="space-y-1">
                    {previewSystems.map((sys) => {
                      const Icon = sys.icon;
                      const isSelected = selectedPreviewSystem === sys.id;
                      return (
                        <button
                          key={sys.id}
                          onClick={() => {
                            setSelectedPreviewSystem(sys.id);
                            // On mobile, advance user to checkpoints tab
                            if (window.innerWidth < 768) {
                              setPreviewMobileTab('items');
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-600/20 text-white border border-orange-500/40 shadow-xs'
                              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold truncate">{sys.name}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0 text-[10px]">
                            <span className="text-slate-400 font-mono">{sys.items} items</span>
                            <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-orange-400' : 'text-slate-600'}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Components & Checkpoints (Width: 3.5 cols on desktop) */}
                <div className={`${previewMobileTab === 'items' ? 'block' : 'hidden'} md:block md:col-span-3 border-b md:border-b-0 md:border-r border-slate-800 p-3 bg-slate-900/60`}>
                  <div className="flex items-center justify-between px-2 py-1 mb-2 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                    <span>Checkpoints</span>
                    <span className="font-mono text-slate-400">{previewActiveItems.length} items</span>
                  </div>
                  <div className="space-y-2">
                    {previewActiveItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            setPreviewMobileTab('narrative');
                          }
                        }}
                        className={`p-2.5 rounded border text-left text-xs cursor-pointer ${
                          idx === (selectedPreviewSystem === 2 ? 1 : 0)
                            ? 'bg-slate-800 text-white border-slate-700 shadow-2xs'
                            : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold mb-1">{item.name}</div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className={`px-1.5 py-0.2 rounded font-semibold ${
                            item.status === 'Defect Noted'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {item.status}
                          </span>
                          <span>{item.commentCount} narratives</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 3: Defect Narrative Studio / Client Output (Width: 5 cols on desktop) */}
                <div className={`${previewMobileTab === 'narrative' ? 'block' : 'hidden'} md:block md:col-span-5 p-4 flex flex-col justify-between bg-slate-900`}>
                  {previewMode === 'inspector' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Active Observation Comment
                        </span>
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>Safety Hazard</span>
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                        <div className="text-xs font-bold text-slate-200">
                          Defect Narrative: Reverse Polarity at Wall Receptacle
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/90 p-3 rounded border border-slate-800/80">
                          Testing indicated <em className="text-amber-300 not-italic font-semibold">reverse polarity</em> at the northeast garage wall receptacle.
                          <div className="mt-2 pt-2 border-t border-slate-800 text-slate-300">
                            <strong className="text-white">Recommendation:</strong> A licensed electrical contractor should evaluate and correct the branch circuit wiring to eliminate electrical shock hazards.
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>Source Tag: <code className="text-orange-400 font-mono">CMT-4-2-2</code></span>
                          <span className="text-emerald-400 flex items-center space-x-1">
                            <Check className="w-3 h-3" />
                            <span>HTML Sanitized & Validated</span>
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Sliders className="w-3.5 h-3.5 text-orange-400" />
                          <span>Continuous cloud auto-save active</span>
                        </div>
                        <span className="text-slate-500 font-mono">v1.0</span>
                      </div>
                    </div>
                  ) : (
                    /* Client Report Preview Mode */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Client Report View (Published Finding)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">
                          Action Required
                        </span>
                      </div>

                      <div className="bg-white text-slate-900 p-4 rounded-lg shadow-md space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-extrabold text-xs text-slate-800">4.2 Electrical Service • Branch Wiring</span>
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Safety Hazard
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Testing indicated <em>reverse polarity</em> at the northeast garage wall receptacle.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-2 text-xs text-amber-900 rounded-r">
                          <strong>Inspector Recommendation:</strong> A licensed electrician should evaluate and correct the circuit wiring to avoid electrical shock hazards.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Action Button at Bottom of Mockup */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Ready to edit your own inspection checklists?</span>
                    <button
                      id="hero-mockup-cta"
                      onClick={onEnterApp}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded transition-colors cursor-pointer flex items-center space-x-1.5"
                    >
                      <span>Enter Workspace</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why Inspectors Choose InspectionCore */}
      <section id="why-inspectioncore" className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-semibold text-orange-600 tracking-wider uppercase">Built for the Field</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 tracking-tight leading-tight">
              Why professional property inspectors choose InspectionCore
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Eliminate clunky legacy software, lost spreadsheet formatting, and repetitive manual typing. InspectionCore gives you the structure you need on site.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-3 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Uncompromising Field Speed</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Organized to mirror your natural walking inspection route. Flow smoothly from exterior envelope and roof to attic, service panels, and HVAC without backtracking.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-3 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Standardized 3-Tier Hierarchy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Systems → Components → Defect Narratives. A disciplined architecture that keeps your reports consistent, legally defensible, and straightforward to read.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-3 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Lossless Data Preservation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cryptographic SHA-256 validation guarantees that every single item, comment, and formatting tag from your spreadsheet is fully accounted for.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-3 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Enterprise Cloud Sync & Auto-Save</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every edit, newly created checkpoint, and updated recommendation saves automatically to secure cloud storage. Zero data loss on device refresh.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Inspection & Template Management */}
      <section id="template-engine" className="py-16 lg:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-semibold text-orange-600 tracking-wider uppercase">Inspection Standards Engine</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 tracking-tight leading-tight">
                Complete control over your inspection standards and checklists.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Whether you perform residential home inspections, commercial property condition assessments, 4-point insurance verifications, or phase inspections, InspectionCore keeps your templates organized and tailored to your market.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Independent Atomic Cloning</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                      Duplicate any template into an isolated, independent standard in one click. Customize it for historic homes or luxury properties without altering your baseline SOP.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Multi-Standard Support</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                      Support for InterNACHI, ASHI, and ASTM E2018 standards with pre-structured systems, items, and defect recommendations.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Live Search & Fast Filtering</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                      Instantly locate any system, electrical disconnect, or furnace defect narrative across thousands of stored observations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  id="btn-section-manage-templates"
                  onClick={onExploreTemplates}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-orange-400" />
                  <span>Manage Templates in Library</span>
                </button>
              </div>
            </div>

            {/* Visual Card Display */}
            <div className="lg:col-span-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-slate-900">Template Directory Snapshot</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {templates.length} Active Templates
                  </span>
                </div>

                {/* Dynamic DB Template or Clean Empty State */}
                {primaryTemplate ? (
                  <div className="p-3.5 rounded-lg border border-orange-200 bg-orange-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{primaryTemplate.name}</span>
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                        {primaryTemplate.status || 'Active SOP'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {primaryTemplate.description || 'Verified property inspection standard template.'}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
                      <span>{primaryTemplate.total_sections || 0} Systems • {primaryTemplate.total_items || 0} Checkpoints • {primaryTemplate.total_comments || 0} Narratives</span>
                      <button
                        onClick={onExploreTemplates}
                        className="text-orange-700 font-bold hover:underline cursor-pointer flex items-center space-x-1"
                      >
                        <span>View in Library</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center space-y-2">
                    <p className="text-xs font-semibold text-slate-700">No Pre-loaded Templates</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Your database is completely fresh and ready for your own custom inspection checklists or Spectora XLSX spreadsheet migrations.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={onOpenImport}
                        className="px-3 py-1 text-[11px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer"
                      >
                        Upload Spreadsheet
                      </button>
                      <button
                        onClick={onEnterApp}
                        className="px-3 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer"
                      >
                        Create in Workspace
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Card */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-900">Create Custom Commercial Checklist</span>
                    <p className="text-[11px] text-slate-500">Draft specialized templates for warehouses, retail, or multi-family.</p>
                  </div>
                  <button
                    onClick={onEnterApp}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors cursor-pointer shrink-0"
                  >
                    + Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Professional Defect Narratives & HTML Reporting */}
      <section id="defect-narratives" className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-semibold text-orange-600 tracking-wider uppercase">Liability Protection & Clarity</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 tracking-tight leading-tight">
              Defect narratives that protect you and inform your clients
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Every inspection finding should explain three things clearly: what was observed, why it matters, and who should evaluate or repair it. InspectionCore structures this automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 space-y-3">
              <div className="w-8 h-8 rounded bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Severity Tagging</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Categorize comments as <strong>Safety Hazard</strong>, <strong>Major Defect</strong>, <strong>Maintenance Item</strong>, or <strong>Informational</strong> so clients know what requires immediate contractor attention.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 space-y-3">
              <div className="w-8 h-8 rounded bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Preserved HTML Formatting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rich text formatting including bolding, lists, and emphasis tags are preserved without corruption, keeping your custom phrasing intact across all export channels.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 space-y-3">
              <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Automated Sanitization</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Strips out malformed styling, broken inline attributes, or unsupported tags from imported spreadsheets while keeping 100% of your wording intact.
              </p>
            </div>
          </div>

          {/* Interactive Snippet Comparison */}
          <div className="mt-10 bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800">
            <div className="text-xs font-mono text-orange-400 mb-3 uppercase tracking-wider font-bold">
              Standardized Narrative Format Example
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase">1. Observation / Condition</div>
                <p className="text-xs text-slate-300">
                  "Exposed copper branch wiring observed inside subpanel without approved strain-relief clamp."
                </p>
              </div>
              <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase">2. Implication / Hazard</div>
                <p className="text-xs text-slate-300">
                  "Sharp metal edges can abrade insulation over time, creating a severe short circuit or fire risk."
                </p>
              </div>
              <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase">3. Recommendation</div>
                <p className="text-xs text-emerald-300 font-medium">
                  "A licensed electrician should install an approved clamp and secure all conductor entries."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Effortless Spreadsheet Migration */}
      <section id="migration" className="py-16 lg:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Visual Upload Simulation Card */}
            <div className="lg:col-span-6">
              <div className="bg-white border-2 border-dashed border-orange-300 rounded-xl p-8 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-2xs">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-slate-900">Spectora & Excel Spreadsheet Ingestion</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload your <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">.xlsx</code> or <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">.xls</code> file to reconstruct your complete inspection standard in seconds.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    id="btn-launch-migration-wizard"
                    onClick={onOpenImport}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Launch Spreadsheet Importer</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-center space-x-4">
                  <span>Auto-detects: Section, Item, Comment, HTML Text</span>
                </div>
              </div>
            </div>

            {/* Explanation & Benefits */}
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-semibold text-orange-600 tracking-wider uppercase">Zero Re-typing Guarantee</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 tracking-tight leading-tight">
                Never abandon years of carefully crafted defect narratives.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Transitioning between inspection platforms usually means retyping hundreds of narratives or hiring expensive data entry services. With InspectionCore's deterministic hierarchy parser, migration takes less than 30 seconds.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-3 text-xs text-slate-700 font-semibold">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Deterministic Parent-Child Hierarchy Reconstruction</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-700 font-semibold">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Pre-Commit Visual Preview & Verification Modal</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-700 font-semibold">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Preservation Audit with SHA-256 Checksums</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Inspector Workflow: Step-by-Step Value */}
      <section id="workflow" className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-semibold text-orange-600 tracking-wider uppercase">Simple 3-Step Journey</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 tracking-tight leading-tight">
              From raw template to professional client reports
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Designed from the inspector's perspective to get you from initial standard selection to field delivery with minimum friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Standardize or Ingest</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload your existing Spectora Excel sheet or build your custom system taxonomy directly in the workspace with zero data loss.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Customize in Workspace</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reorder inspection systems to match your route, add custom component checkpoints, and polish defect narratives in the 3-panel workspace studio with live autosave.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Execute Field Audits</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Conduct on-site inspections with total confidence. Tag severity levels, attach clear contractor recommendations, and deliver audit-proof reports clients and agents love.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Call to Action Banner */}
      <section className="py-16 bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-12 h-12 rounded bg-orange-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <Building className="w-6 h-6" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-tight">
            Ready to experience next-generation inspection reporting?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Launch the workspace right now, explore pre-built inspection standards, or upload your own spreadsheet to see deterministic migration in action.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              id="cta-banner-launch-workspace"
              onClick={onEnterApp}
              className="inline-flex items-center space-x-2 px-6 py-3 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <span>Get Started — Enter Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="cta-banner-import-sheet"
              onClick={onOpenImport}
              className="inline-flex items-center space-x-2 px-5 py-3 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span>Import Existing Spreadsheet</span>
            </button>
          </div>
        </div>
      </section>

      {/* 9. Professional Commercial Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded bg-orange-600 flex items-center justify-center text-white font-bold">
                <Building className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm text-white tracking-tight">InspectionCore</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Professional property inspection standards, spreadsheet migration engine, and defect reporting platform.
            </p>
            <div className="text-[10px] text-slate-600 font-mono">
              Enterprise Cloud Architecture • 100% Lossless Migration
            </div>
          </div>

          {/* Col 2: Platform Workflows */}
          <div className="space-y-2">
            <div className="font-bold text-slate-200 text-xs uppercase tracking-wider">Platform Workflows</div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={onEnterApp} className="hover:text-white transition-colors cursor-pointer">
                  Inspector Workspace
                </button>
              </li>
              <li>
                <button onClick={onExploreTemplates} className="hover:text-white transition-colors cursor-pointer">
                  Template Library
                </button>
              </li>
              <li>
                <button onClick={onOpenImport} className="hover:text-white transition-colors cursor-pointer">
                  Spreadsheet Migration (.XLSX)
                </button>
              </li>
              <li>
                <a href="#why-inspectioncore" className="hover:text-white transition-colors">
                  Why InspectionCore
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Standards Alignment */}
          <div className="space-y-2">
            <div className="font-bold text-slate-200 text-xs uppercase tracking-wider">Inspection Standards</div>
            <ul className="space-y-1.5 text-[11px] text-slate-500">
              <li>InterNACHI Standards of Practice</li>
              <li>ASHI Home Inspection Standards</li>
              <li>ASTM E2018 Commercial SOP</li>
              <li>4-Point & Wind Mitigation Checklists</li>
            </ul>
          </div>

          {/* Col 4: Quick Launch */}
          <div className="space-y-3">
            <div className="font-bold text-slate-200 text-xs uppercase tracking-wider">Immediate Access</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              No account required in demo mode. Access the full inspector workbench now.
            </p>
            <button
              id="footer-btn-launch"
              onClick={onEnterApp}
              className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded text-xs transition-colors cursor-pointer"
            >
              Launch Platform
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-600">
          <span>&copy; {new Date().getFullYear()} InspectionCore Technologies. All rights reserved.</span>
          <div className="flex items-center space-x-4">
            <a href="#brand-logo-nav" className="hover:text-slate-400 transition-colors">Return to Top ↑</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
