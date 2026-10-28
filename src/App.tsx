import React, { useState } from 'react';
import { TopNavigation } from './components/toolbar/TopNavigation';
import { LeftIllustrationToolbar } from './components/toolbar/LeftIllustrationToolbar';
import { CanvasEditor } from './components/canvas/CanvasEditor';
import { RightSideGlyphGrid } from './components/glyph-grid/RightSideGlyphGrid';
import { ExportModal } from './components/modals/ExportModal';
import { ProjectSettingsModal } from './components/modals/ProjectSettingsModal';
import { FontPreviewModal } from './components/modals/FontPreviewModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export const App: React.FC = () => {
  // Global keyboard shortcuts (Undo, Redo, Save, Tools, Stroke adjustments)
  useKeyboardShortcuts();

  // Font Live Type Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans select-none">
      {/* 1. Top Navigation: Project name, Reference Font, Import Font, Type Preview, Save, Export, Settings */}
      <TopNavigation onOpenPreview={() => setIsPreviewOpen(true)} />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Illustration Studio Toolbar (Pen, Calligraphy Brush, Eraser, Select, Stroke & Smoothing, Colors) */}
        <LeftIllustrationToolbar />

        {/* Center: Resizable Drawing Canvas with Authentic Kannada Guidelines & Vector Outline */}
        <main className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-100">
          <CanvasEditor />
        </main>

        {/* Right Side: Cards Grid with Live SVG Written Preview & Actual Word in Top Right Corner */}
        <RightSideGlyphGrid />
      </div>

      {/* Modals */}
      <ExportModal />
      <ProjectSettingsModal />
      <FontPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />
    </div>
  );
};

export default App;
