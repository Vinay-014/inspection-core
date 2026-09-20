import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { InspectorOverview } from './components/InspectorOverview';
import { TemplateList } from './components/TemplateList';
import { TemplateEditor } from './components/TemplateEditor';
import { CreateTemplateModal } from './components/CreateTemplateModal';
import { ImportModal } from './components/ImportModal';
import { PreservationModal } from './components/PreservationModal';
import { IssuesDrawer } from './components/IssuesDrawer';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { LandingPage } from './components/LandingPage';
import { AnimatePresence, motion } from 'motion/react';
import { Building } from 'lucide-react';
import { Template, SelectedNodeType } from './types';

export default function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNodeType>({ type: 'template' });
  const [activeView, setActiveView] = useState<'landing' | 'overview' | 'library' | 'editor'>('landing');
  const [dbStatus, setDbStatus] = useState<'connected' | 'checking' | 'error'>('checking');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [isRecentClone, setIsRecentClone] = useState(false);

  // Seamless Navigation Transition State
  const [navTransition, setNavTransition] = useState<{
    active: boolean;
    type: 'enter-workspace' | 'exit-home';
    targetView: 'landing' | 'overview' | 'library' | 'editor';
    targetTemplateId?: string;
    progress: number;
  } | null>(null);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditTemplate, setAuditTemplate] = useState<Template | null>(null);
  const [isIssuesDrawerOpen, setIsIssuesDrawerOpen] = useState(false);

  // Toast notification queue
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Check Database Connection Health
  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (res.ok && data.database === 'connected') {
        setDbStatus('connected');
      } else {
        setDbStatus('error');
      }
    } catch {
      setDbStatus('error');
    }
  };

  // Fetch all templates
  const fetchTemplates = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (res.ok && data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      addToast('error', 'Network Error', 'Could not load templates from database');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch single template with full hierarchy
  const fetchTemplateDetails = useCallback(async (templateId: string) => {
    try {
      const res = await fetch(`/api/templates/${templateId}`);
      const data = await res.json();
      if (res.ok && data.template) {
        setSelectedTemplate(data.template);
        return data.template;
      }
    } catch (err) {
      console.error('Failed to fetch template hierarchy:', err);
      addToast('error', 'Error', 'Failed to retrieve template details');
    }
    return null;
  }, []);

  useEffect(() => {
    checkHealth();
    fetchTemplates();
  }, [fetchTemplates]);

  // Open Template in Editor
  const handleSelectTemplate = async (templateId: string, asClone: boolean = false) => {
    const fullTemplate = await fetchTemplateDetails(templateId);
    if (fullTemplate) {
      setIsRecentClone(asClone);
      if (fullTemplate.sections && fullTemplate.sections.length > 0) {
        const firstSec = fullTemplate.sections[0];
        if (firstSec.items && firstSec.items.length > 0) {
          setSelectedNode({ type: 'item', sectionId: firstSec.id, itemId: firstSec.items[0].id });
        } else {
          setSelectedNode({ type: 'section', sectionId: firstSec.id });
        }
      } else {
        setSelectedNode({ type: 'template' });
      }
      setActiveView('editor');
    }
  };

  // Seamless view transition handler
  const navigateTo = useCallback(
    (targetView: 'landing' | 'overview' | 'library' | 'editor', templateId?: string) => {
      const isEntering = targetView !== 'landing' && activeView === 'landing';
      const isExiting = targetView === 'landing' && activeView !== 'landing';

      if (isEntering) {
        setNavTransition({
          active: true,
          type: 'enter-workspace',
          targetView,
          targetTemplateId: templateId,
          progress: 30
        });

        const timer1 = setTimeout(() => {
          setNavTransition(prev => (prev ? { ...prev, progress: 80 } : null));
        }, 110);

        const timer2 = setTimeout(() => {
          setNavTransition(prev => (prev ? { ...prev, progress: 100 } : null));
          if (templateId) {
            handleSelectTemplate(templateId, false);
          } else {
            setActiveView(targetView);
          }
          const timer3 = setTimeout(() => {
            setNavTransition(null);
          }, 150);
          return () => clearTimeout(timer3);
        }, 280);

        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      } else if (isExiting) {
        setNavTransition({
          active: true,
          type: 'exit-home',
          targetView: 'landing',
          progress: 40
        });

        const timer1 = setTimeout(() => {
          setNavTransition(prev => (prev ? { ...prev, progress: 100 } : null));
          setActiveView('landing');
          window.scrollTo({ top: 0, behavior: 'instant' });
          const timer2 = setTimeout(() => {
            setNavTransition(null);
          }, 120);
          return () => clearTimeout(timer2);
        }, 200);

        return () => clearTimeout(timer1);
      } else {
        // Switching between views within the workspace
        if (templateId) {
          handleSelectTemplate(templateId, false);
        } else {
          setActiveView(targetView);
        }
      }
    },
    [activeView]
  );

  // Create new template directly
  const handleCreateTemplate = async (name: string, description: string) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create template');

      addToast('success', 'Template Created', `"${data.template.name}" has been created.`);
      await fetchTemplates();
      await handleSelectTemplate(data.template.id, false);
    } catch (err: any) {
      addToast('error', 'Creation Failed', err.message);
      throw err;
    }
  };

  // Duplicate Template (Atomic Deep Clone)
  const handleDuplicateTemplate = async (templateId: string, customName?: string) => {
    setIsDuplicating(templateId);
    try {
      const res = await fetch(`/api/templates/${templateId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: customName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to duplicate template');

      addToast(
        'success',
        'Independent Copy Created',
        `Cloned as "${data.template.name}". Modifications here are isolated and will not affect the original.`
      );

      await fetchTemplates();
      // Automatically switch user to editing the duplicate!
      await handleSelectTemplate(data.template.id, true);
    } catch (err: any) {
      addToast('error', 'Duplication Failed', err.message);
    } finally {
      setIsDuplicating(null);
    }
  };

  // Delete Template Confirmation Trigger
  const handleDeleteTemplatePrompt = (template: Template) => {
    setTemplateToDelete(template);
  };

  // Execute Confirmed Delete in Database
  const handleConfirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    const templateId = templateToDelete.id;
    const templateName = templateToDelete.name;
    setIsDeleting(templateId);
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete template');

      addToast('info', 'Template Deleted', `"${templateName}" has been removed from database.`);
      if (selectedTemplate?.id === templateId) {
        setActiveView('library');
        setSelectedTemplate(null);
      }
      setTemplateToDelete(null);
      await fetchTemplates();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  // Update Template Properties
  const handleUpdateTemplate = async (id: string, updates: Partial<Template>) => {
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      addToast('success', 'Saved', 'Template details updated.');
      await fetchTemplateDetails(id);
      await fetchTemplates();
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  // Update Issue resolution status
  const handleUpdateIssueStatus = async (issueId: string, status: 'UNRESOLVED' | 'RESOLVED' | 'DISMISSED') => {
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_status: status })
      });
      if (!res.ok) throw new Error('Failed to update issue');

      if (selectedTemplate) {
        await fetchTemplateDetails(selectedTemplate.id);
      }
      addToast('info', 'Status Updated', `Issue marked as ${status.toLowerCase()}.`);
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  // Aggregate unresolved issues count for sidebar badge
  const unresolvedIssuesCount = (selectedTemplate?.issues || []).filter(
    i => i.resolution_status === 'UNRESOLVED'
  ).length;

  // Derive active hierarchy entities for breadcrumb display & navigation
  const activeSection = selectedTemplate?.sections?.find(
    s => 'sectionId' in selectedNode && s.id === selectedNode.sectionId
  );
  const activeItem = activeSection?.items?.find(
    i => 'itemId' in selectedNode && i.id === selectedNode.itemId
  );
  const activeComment = activeItem?.comments?.find(
    c => 'commentId' in selectedNode && c.id === selectedNode.commentId
  );
  const activeCommentIndex = activeItem && activeComment
    ? (activeItem.comments?.findIndex(c => c.id === activeComment.id) ?? -1)
    : -1;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-900 font-sans antialiased select-none overflow-x-hidden">
      <AnimatePresence mode="wait">
        {activeView === 'landing' ? (
          <motion.div
            key="landing-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="min-h-screen bg-slate-50 font-sans"
            id="app-landing-root"
          >
            <LandingPage
              templates={templates}
              onEnterApp={() => navigateTo('overview')}
              onExploreTemplates={() => navigateTo('library')}
              onOpenImport={() => setIsImportModalOpen(true)}
              onSelectTemplate={(id) => navigateTo('editor', id)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="workspace-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeOut' } }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="min-h-screen bg-slate-100 text-slate-900 font-sans flex antialiased select-none"
            id="app-desktop-root"
          >
            {/* 1. Desktop Persistent Sidebar */}
            <Sidebar
              activeView={activeView}
              onNavigateView={(view) => {
                if (view === 'landing' || view === 'overview' || view === 'library') {
                  navigateTo(view);
                } else if (view === 'editor') {
                  if (selectedTemplate) {
                    navigateTo('editor');
                  } else if (templates.length > 0) {
                    navigateTo('editor', templates[0].id);
                  } else {
                    navigateTo('library');
                  }
                }
              }}
              onOpenImport={() => setIsImportModalOpen(true)}
              onOpenAudit={() => {
                setAuditTemplate(selectedTemplate || templates[0] || null);
                setIsAuditModalOpen(true);
              }}
              onOpenIssues={() => {
                if (selectedTemplate) {
                  setIsIssuesDrawerOpen(true);
                } else if (templates.length > 0) {
                  handleSelectTemplate(templates[0].id).then(() => {
                    setIsIssuesDrawerOpen(true);
                  });
                }
              }}
              templateCount={templates.length}
              unresolvedIssuesCount={unresolvedIssuesCount}
              dbStatus={dbStatus}
              currentTemplate={selectedTemplate}
            />

            {/* 2. Main Content View Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
              {/* Top Header & Breadcrumb Toolbar */}
              <TopNav
                activeView={activeView}
                currentTemplate={selectedTemplate}
                activeSectionName={activeSection?.name}
                activeSectionId={activeSection?.id}
                activeItemName={activeItem?.name}
                activeItemId={activeItem?.id}
                activeCommentLabel={activeCommentIndex >= 0 ? `Observation #${activeCommentIndex + 1}` : undefined}
                currentNodeType={selectedNode.type}
                onNavigateHome={() => {
                  navigateTo('library');
                }}
                onNavigateLanding={() => {
                  navigateTo('landing');
                }}
                onNavigateToTemplate={() => setSelectedNode({ type: 'template' })}
                onNavigateToSection={(secId) => setSelectedNode({ type: 'section', sectionId: secId })}
                onNavigateToItem={(secId, itmId) => setSelectedNode({ type: 'item', sectionId: secId, itemId: itmId })}
                onOpenImport={() => setIsImportModalOpen(true)}
                onOpenCreate={() => setIsCreateModalOpen(true)}
                onRefresh={fetchTemplates}
                isRefreshing={isRefreshing}
                onDuplicateTemplate={handleDuplicateTemplate}
                onOpenAudit={() => {
                  if (selectedTemplate) {
                    setAuditTemplate(selectedTemplate);
                    setIsAuditModalOpen(true);
                  }
                }}
              />

              {/* Dynamic View Display: Overview vs Library vs Editor with Sub-View Fade Transitions */}
              <main className="flex-1 overflow-y-auto relative" id="main-view-container">
                <AnimatePresence mode="wait">
                  {activeView === 'overview' ? (
                    <motion.div
                      key="overview-subview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      <InspectorOverview
                        templates={templates}
                        onSelectTemplate={(id) => handleSelectTemplate(id, false)}
                        onNavigateLibrary={() => navigateTo('library')}
                        onNavigateLanding={() => navigateTo('landing')}
                        onOpenCreate={() => setIsCreateModalOpen(true)}
                        onOpenImport={() => setIsImportModalOpen(true)}
                        onDuplicateTemplate={handleDuplicateTemplate}
                        isDuplicating={isDuplicating}
                      />
                    </motion.div>
                  ) : activeView === 'library' || !selectedTemplate ? (
                    <motion.div
                      key="library-subview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      <TemplateList
                        templates={templates}
                        onSelectTemplate={(id) => handleSelectTemplate(id, false)}
                        onNavigateLanding={() => navigateTo('landing')}
                        onDuplicateTemplate={handleDuplicateTemplate}
                        onDeleteTemplate={handleDeleteTemplatePrompt}
                        onOpenAudit={(tpl) => {
                          setAuditTemplate(tpl);
                          setIsAuditModalOpen(true);
                        }}
                        onOpenImport={() => setIsImportModalOpen(true)}
                        onOpenCreate={() => setIsCreateModalOpen(true)}
                        isDuplicating={isDuplicating}
                        isDeleting={isDeleting}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`editor-subview-${selectedTemplate.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      <TemplateEditor
                        template={selectedTemplate}
                        selectedNode={selectedNode}
                        onSelectNode={setSelectedNode}
                        onUpdateTemplate={handleUpdateTemplate}
                        onDuplicateTemplate={handleDuplicateTemplate}
                        onDeleteTemplate={handleDeleteTemplatePrompt}
                        onOpenIssues={() => setIsIssuesDrawerOpen(true)}
                        onOpenAudit={() => {
                          setAuditTemplate(selectedTemplate);
                          setIsAuditModalOpen(true);
                        }}
                        onRefreshTemplate={async () => {
                          if (selectedTemplate) await fetchTemplateDetails(selectedTemplate.id);
                        }}
                        isDuplicatedClone={isRecentClone}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seamless Navigation Transition Overlay */}
      <AnimatePresence>
        {navTransition?.active && (
          <motion.div
            key="navigation-transition-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md text-white select-none pointer-events-auto"
            id="navigation-transition-overlay"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex flex-col items-center max-w-sm px-6 text-center space-y-4"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30">
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -inset-1.5 rounded-2xl bg-orange-500/20 animate-ping -z-10" />
              </div>

              <div>
                <h3 className="text-lg font-normal text-white tracking-tight">
                  {navTransition.type === 'enter-workspace'
                    ? 'Entering Inspection Workspace'
                    : 'Returning to Home Page'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {navTransition.type === 'enter-workspace'
                    ? 'Preparing inspection studio & taxonomy...'
                    : 'Switching view to public home...'}
                </p>
              </div>

              {/* Seamless micro progress track */}
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-orange-500 rounded-full"
                  initial={{ width: '15%' }}
                  animate={{ width: `${navTransition.progress}%` }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Common Modals & Overlays Accessible Across Any Screen */}
      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTemplate={handleCreateTemplate}
      />

      <ConfirmModal
        isOpen={!!templateToDelete}
        title={`Delete "${templateToDelete?.name}"?`}
        description={`This will permanently remove "${templateToDelete?.name}" and all of its sections (${templateToDelete?.total_sections ?? 0}), items (${templateToDelete?.total_items ?? 0}), and observation comments (${templateToDelete?.total_comments ?? 0}) from the database. This operation cannot be undone.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isDeleting === templateToDelete?.id}
        onConfirm={handleConfirmDeleteTemplate}
        onClose={() => {
          if (!isDeleting) setTemplateToDelete(null);
        }}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={async (newId) => {
          await fetchTemplates();
          await handleSelectTemplate(newId, false);
          addToast('success', 'Import Successful', 'Inspection template imported and saved to database.');
        }}
      />

      <PreservationModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setAuditTemplate(null);
        }}
        template={auditTemplate}
      />

      {selectedTemplate && (
        <IssuesDrawer
          isOpen={isIssuesDrawerOpen}
          onClose={() => setIsIssuesDrawerOpen(false)}
          issues={selectedTemplate.issues || []}
          templateName={selectedTemplate.name}
          onUpdateIssueStatus={handleUpdateIssueStatus}
        />
      )}

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
      />
    </div>
  );
}
