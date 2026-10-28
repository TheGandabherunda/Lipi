import React, { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { Sparkles, X } from 'lucide-react';

export const CanvasToast: React.FC = () => {
  const toastMessage = useUIStore((s) => s.toastMessage);
  const hideToast = useUIStore((s) => s.hideToast);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage, hideToast]);

  if (!toastMessage) return null;

  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <div className="bg-slate-900/90 text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-slate-700/60 flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-top-3 duration-200">
        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>{toastMessage}</span>
        <button
          type="button"
          onClick={hideToast}
          className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

