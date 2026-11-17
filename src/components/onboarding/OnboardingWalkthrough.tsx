import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import {
  Compass,
  PenTool,
  SlidersHorizontal,
  FileCheck2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  X,
  Sparkles,
  Grid,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Step {
  title: string;
  subtitle: string;
  badge: string;
  icon: React.FC<{ className?: string }>;
  description: string;
  highlights: string[];
  kannadaExample: string;
}

const ONBOARDING_STEPS: Step[] = [
  {
    title: 'Comprehensive Kannada Glyph Roster',
    subtitle: 'Full coverage for classic, modern, and archaic Kannada script',
    badge: 'Step 1 of 5',
    icon: Compass,
    kannadaExample: 'ಅ ಆ ಇ ಈ ... ಕ ಖ ಗ ಘ',
    description:
      'Lipi includes a curated roster of 80+ Kannada characters categorized into Swaragalu (Vowels), Vyanjanagalu (Consonants), Gunithakshara (Matras), Ottakshara (Conjunct references), Digits, and Archaic symbols. Each glyph tracks production status (Empty, Started, Ready for Export).',
    highlights: [
      'Filter by category, search by Unicode hex or name',
      'Track progress from blank slate to release-ready',
      'Select any glyph card on the right to start editing',
    ],
  },
  {
    title: 'Drawing Studio & Anatomical Components',
    subtitle: 'Smooth Bézier vector curves and reusable Kannada typography parts',
    badge: 'Step 2 of 5',
    icon: PenTool,
    kannadaExample: 'ಶಿರೋರೇಖೆ • ತಲೆಕಟ್ಟು • ಕೊಂಬು',
    description:
      'Draw with the precision Bézier Pen tool (P), smooth freehand Calligraphy Brush (B), or Direct Select (A) to edit individual anchors and control handles. Speed up your workflow by stamping calibrated Kannada typographical components (Classic Talekattu, Gudisu, Kombu, Virama, Vattrisuli) directly onto your glyphs.',
    highlights: [
      'Precision Bézier pen with automatic smooth / corner anchor detection',
      'Reusable Kannada typography component catalog',
      'Save your own drawn shapes as reusable library components',
    ],
  },
  {
    title: 'Kannada Typographic Guidelines & Snapping',
    subtitle: 'Authentic 1000 UPM metrics tailored for Indic vertical proportions',
    badge: 'Step 3 of 5',
    icon: Grid,
    kannadaExample: 'Ascender 790 • Body 565 • Base 0 • Descender -420',
    description:
      'Kannada typography requires precise vertical zone division. Lipi provides pre-calibrated guidelines: Talekattu / Ascender (+790), Consonant Body / Shirorekha (+565), Baseline (0), Mahaprana tail (-144), and Ottakshara / Descender (-420). Enable snapping to keep your letterforms consistent.',
    highlights: [
      'Industrial guideline overlays with Indic zone tints',
      'Configurable grid size with magnetic snapping',
      'One-click Auto-Fit guidelines to character bounding box',
    ],
  },
  {
    title: 'Visual Spacing & Sidebearing Studio',
    subtitle: 'Advance width and sidebearings tested in live reading context',
    badge: 'Step 4 of 5',
    icon: SlidersHorizontal,
    kannadaExample: 'ಕ [ಆ] ಕ • ರ [ಮ] ರ',
    description:
      'Never space glyphs blindly. The Spacing Inspector lets you dial in Left Sidebearing (LSB), Right Sidebearing (RSB), and Advance Width. Test spacing visually with flanking letters in real Kannada reading context, and use the Auto-Fit button to calculate bearings from your drawn path bounds.',
    highlights: [
      'Advance width stepper, slider, and quick UPM presets',
      'Left & Right Sidebearing numerical controls with visual origin markers',
      'Live reading preview with flanking consonants',
    ],
  },
  {
    title: 'Preflight Quality Control & Font Export',
    subtitle: 'Automated verification before compiling desktop & web binaries',
    badge: 'Step 5 of 5',
    icon: FileCheck2,
    kannadaExample: '.OTF • .TTF • .WOFF • .ZIP',
    description:
      'Before generating your font, Lipi runs an industrial preflight QA check to detect open contours with fill, corrupted coordinates, zero advance widths, and metric anomalies. Once cleared, compile directly to OpenType (.otf), TrueType (.ttf), Web font (.woff), or a complete ZIP package with an interactive browser type-tester.',
    highlights: [
      'Zero corrupted exports: strict automated validation gates',
      'Test complex Kannada conjuncts in the Live Type Preview modal',
      'Cross-platform OpenType PostScript CFF binaries ready for Windows, macOS, and web',
    ],
  },
];

export const OnboardingWalkthrough: React.FC = () => {
  const isOpen = useUIStore((s) => s.isOnboardingOpen);
  const setIsOpen = useUIStore((s) => s.setIsOnboardingOpen);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === ONBOARDING_STEPS.length - 1;
  const StepIcon = currentStep.icon;

  const handleFinish = () => {
    localStorage.setItem('lipi:onboarded', 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Welcome to Lipi</h3>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Quick Guide
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Kannada Font Design & Vector Typography Studio</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close walkthrough"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Visual & Content */}
        <div className="p-6 flex flex-col gap-5">
          {/* Card Top Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-slate-50/50 to-purple-50/40 border border-indigo-100 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-200/80 shadow-xs flex items-center justify-center text-indigo-600 shrink-0">
              <StepIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  {currentStep.badge}
                </span>
                <span className="text-xs font-kannada font-bold text-indigo-900 bg-white/80 px-2 py-0.5 rounded-lg border border-indigo-100">
                  {currentStep.kannadaExample}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-1">{currentStep.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{currentStep.subtitle}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 leading-relaxed font-sans">{currentStep.description}</p>

          {/* Highlights */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-700">Key Capabilities:</span>
            <div className="flex flex-col gap-1.5">
              {currentStep.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {ONBOARDING_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={clsx(
                  'h-1.5 rounded-full transition-all duration-200 cursor-pointer',
                  idx === currentStepIndex
                    ? 'w-6 bg-indigo-600'
                    : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                )}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleBack}
            disabled={isFirst}
            className={clsx(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border',
              isFirst
                ? 'opacity-0 pointer-events-none'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFinish}
              className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Skip Tour
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{isLast ? 'Get Started' : 'Next'}</span>
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
