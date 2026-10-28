import React, { useState, useEffect, useId, useMemo } from 'react';
import { useGlyphStore } from '../../store/glyphStore';
import { useUIStore } from '../../store/uiStore';
import { compileFontAsync, compileFontStandalone } from '../../utils/fontCompiler';
import { KANNADA_CHARACTERS_LIST } from '../../constants/kannadaCharacters';
import { KANNADA_GOOGLE_FONTS } from '../../utils/googleFontsManager';
import { transliterateEnglishToKannada } from '../../utils/kannadaTransliteration';
import {
  X,
  Sparkles,
  Layers,
  BookMarked,
  Grid3X3,
  Copy,
  Check,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Keyboard,
  SlidersHorizontal,
  ChevronDown,
  Space,
  CornerDownLeft,
  Delete,
} from 'lucide-react';
import { clsx } from 'clsx';

interface FontPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_PRESETS = [
  {
    category: 'Essential',
    label: 'ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ (Historic Motto)',
    text: 'ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ, ಸಿರಿಗನ್ನಡಂ ಬಾಳ್ಗೆ!',
  },
  {
    category: 'Poetry',
    label: 'ಕುವೆಂಪು (Kuvempu Poetry)',
    text: 'ಎಲ್ಲಾದರೂ ಇರು, ಎಂತಾದರೂ ಇರು, ಎಂದೆಂದಿಗೂ ನೀ ಕನ್ನಡವಾಗಿರು. ಕನ್ನಡ ಎನೆ ಕುಣಿದಾಡುವುದೆನ್ನೆದೆ, ಕನ್ನಡ ಎನೆ ಕಿವಿ ನಿಮಿರುವುದು.',
  },
  {
    category: 'Essential',
    label: 'ಪದಗಳು (Common Words)',
    text: 'ಕನ್ನಡ ಲಿಪಿ ನುಡಿ, ನಮಸ್ಕಾರ, ಕರ್ನಾಟಕ, ಬೆಂಗಳೂರು, ಕಾವೇರಿ, ಕರಾವಳಿ, ಮೈಸೂರು',
  },
  {
    category: 'Complex CTL',
    label: 'ಒತ್ತಕ್ಷರಗಳು (Conjuncts & Ligatures)',
    text: 'ಅಕ್ಕ, ಅತ್ತೆ, ಅಣ್ಣ, ಅಪ್ಪ, ಅಮ್ಮ, ಶಕ್ತಿ, ವಿದ್ಯಾ, ಸೂರ್ಯ, ಕೃಷ್ಣ, ಪುಷ್ಪ, ಧನುಸ್ಸು, ರಾಷ್ಟ್ರ, ಸ್ನೇಹಿತ, ಜ್ಞಾನ',
  },
  {
    category: 'Vowel Signs',
    label: 'ಕ-ಗುಣಿತಾಕ್ಷರ (Ka Gunithakshara)',
    text: 'ಕ ಕಾ ಕಿ ಕೀ ಕು ಕೂ ಕೃ ಕೆ ಕೇ ಕೈ ಕೊ ಕೋ ಕೌ ಕಂ ಕಃ ಕ್',
  },
  {
    category: 'Vowel Signs',
    label: 'ಪ-ಗುಣಿತಾಕ್ಷರ (Pa Gunithakshara)',
    text: 'ಪ ಪಾ ಪಿ ಪೀ ಪು ಪೂ ಪೃ ಪೆ ಪೇ ಪೈ ಪೊ ಪೋ ಪೌ ಪಂ ಪಃ ಪ್',
  },
  {
    category: 'Alphabet',
    label: 'ಸ್ವರಗಳು (Vowels)',
    text: 'ಅ ಆ ಇ ಈ ಉ ಊ ಋ ಎ ಏ ಐ ಒ ಓ ಔ ಅಂ ಅಃ',
  },
  {
    category: 'Alphabet',
    label: 'ವ್ಯಂಜನಗಳು (Consonants)',
    text: 'ಕ ಖ ಗ ಘ ಙ ಚ ಛ ಜ ಝ ಞ ಟ ಠ ಡ ಢ ಣ ತ ಥ ದ ಧ ನ ಪ ಫ ಬ ಭ ಮ ಯ ರ ಲ ವ ಶ ಷ ಸ ಹ ಳ',
  },
  {
    category: 'Numbers',
    label: 'ಅಂಕಿಗಳು (Numerals)',
    text: '೦ ೧ ೨ ೩ ೪ ೫ ೬ ೭ ೮ ೯ (೧೯೪೭ - ೨೦೨೬)',
  },
];

const GUNITHAKSHARA_CONSONANTS = [
  'ಕ', 'ಖ', 'ಗ', 'ಘ', 'ಚ', 'ಛ', 'ಜ', 'ಝ', 'ಟ', 'ಠ', 'ಡ', 'ಢ', 'ಣ',
  'ತ', 'ಥ', 'ದ', 'ಧ', 'ನ', 'ಪ', 'ಫ', 'ಬ', 'ಭ', 'ಮ', 'ಯ', 'ರ', 'ಲ',
  'ವ', 'ಶ', 'ಷ', 'ಸ', 'ಹ', 'ಳ',
];

const MATRA_SIGNS = [
  { sign: '', name: 'Mula' },
  { sign: 'ಾ', name: 'Deergha' },
  { sign: 'ಿ', name: 'Gudisu' },
  { sign: 'ೀ', name: 'Gudisu D.' },
  { sign: 'ು', name: 'Kombu' },
  { sign: 'ೂ', name: 'Kombu D.' },
  { sign: 'ೃ', name: 'Vattrisuli' },
  { sign: 'ೆ', name: 'Ettva' },
  { sign: 'ೇ', name: 'Ettva D.' },
  { sign: 'ೈ', name: 'Aittva' },
  { sign: 'ೊ', name: 'Ottva' },
  { sign: 'ೋ', name: 'Ottva D.' },
  { sign: 'ೌ', name: 'Auttva' },
  { sign: 'ಂ', name: 'Anusvara' },
  { sign: 'ಃ', name: 'Visarga' },
  { sign: '್', name: 'Halant' },
];

const KEYPAD_CATEGORIES = {
  vowels: [
    { char: 'ಅ', name: 'a' },
    { char: 'ಆ', name: 'aa' },
    { char: 'ಇ', name: 'i' },
    { char: 'ಈ', name: 'ii' },
    { char: 'ಉ', name: 'u' },
    { char: 'ಊ', name: 'uu' },
    { char: 'ಋ', name: 'Ru' },
    { char: 'ಎ', name: 'e' },
    { char: 'ಏ', name: 'E' },
    { char: 'ಐ', name: 'ai' },
    { char: 'ಒ', name: 'o' },
    { char: 'ಓ', name: 'O' },
    { char: 'ಔ', name: 'au' },
    { char: 'ಅಂ', name: 'am' },
    { char: 'ಅಃ', name: 'aha' },
  ],
  consonants: [
    'ಕ', 'ಖ', 'ಗ', 'ಘ', 'ಙ',
    'ಚ', 'ಛ', 'ಜ', 'ಝ', 'ಞ',
    'ಟ', 'ಠ', 'ಡ', 'ಢ', 'ಣ',
    'ತ', 'ಥ', 'ದ', 'ಧ', 'ನ',
    'ಪ', 'ಫ', 'ಬ', 'ಭ', 'ಮ',
    'ಯ', 'ರ', 'ಲ', 'ವ', 'ಶ',
    'ಷ', 'ಸ', 'ಹ', 'ಳ',
  ],
  matras: [
    { char: 'ಾ', name: 'ದೀರ್ಘ (aa)' },
    { char: 'ಿ', name: 'ಗುಡಿಸು (i)' },
    { char: 'ೀ', name: 'ಗುಡಿಸು ದೀರ್ಘ (ii)' },
    { char: 'ು', name: 'ಕೊಂಬು (u)' },
    { char: 'ೂ', name: 'ಕೊಂಬು ದೀರ್ಘ (uu)' },
    { char: 'ೃ', name: 'ವಟ್ರುಸುಳಿ (Ru)' },
    { char: 'ೆ', name: 'ಏತ್ವ (e)' },
    { char: 'ೇ', name: 'ಏತ್ವ ದೀರ್ಘ (E)' },
    { char: 'ೈ', name: 'ಐತ್ವ (ai)' },
    { char: 'ೊ', name: 'ಓತ್ವ (o)' },
    { char: 'ೋ', name: 'ಓತ್ವ ದೀರ್ಘ (O)' },
    { char: 'ೌ', name: 'ಔತ್ವ (au)' },
    { char: '್', name: 'ಒತ್ತು / ಹಸಂತ' },
    { char: 'ಂ', name: 'ಅನುಸ್ವಾರ (am)' },
    { char: 'ಃ', name: 'ವಿಸರ್ಗ (aha)' },
  ],
  conjuncts: [
    { char: 'ಕ್ಕ', name: 'k-ka' },
    { char: 'ತ್ತ', name: 't-ta' },
    { char: 'ನ್ನ', name: 'n-na' },
    { char: 'ಪ್ಪ', name: 'p-pa' },
    { char: 'ಮ್ಮ', name: 'm-ma' },
    { char: 'ಲ್ಲ', name: 'l-la' },
    { char: 'ಷ್ಟ', name: 'sh-ta' },
    { char: 'ರ್ಕ', name: 'r-ka' },
    { char: 'ಕ್ಷ', name: 'ksha' },
    { char: 'ಜ್ಞ', name: 'jna' },
  ],
};

const WATERFALL_TIERS = [
  { size: 84, label: '84px • Display Title' },
  { size: 64, label: '64px • Primary Headline' },
  { size: 48, label: '48px • Secondary Headline' },
  { size: 36, label: '36px • Subheading' },
  { size: 28, label: '28px • Section Header' },
  { size: 20, label: '20px • Feature Lead' },
  { size: 16, label: '16px • Body Typography' },
  { size: 13, label: '13px • Caption & Metadata' },
];

export const FontPreviewModal: React.FC<FontPreviewModalProps> = ({ isOpen, onClose }) => {
  const [typedText, setTypedText] = useState('ಕನ್ನಡ ಲಿಪಿ ನುಡಿ • ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ, ಸಿರಿಗನ್ನಡಂ ಬಾಳ್ಗೆ!');
  const [fontSize, setFontSize] = useState(48);
  const [lineHeight, setLineHeight] = useState(1.35);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [viewMode, setViewMode] = useState<'typewriter' | 'waterfall' | 'matrix' | 'roster'>('typewriter');
  const [paperTheme, setPaperTheme] = useState<'white' | 'parchment' | 'dark'>('white');
  const [showKeypad, setShowKeypad] = useState(false);
  const [showTypographyPopover, setShowTypographyPopover] = useState(false);
  const [activeKeypadTab, setActiveKeypadTab] = useState<'vowels' | 'consonants' | 'matras' | 'conjuncts'>('matras');
  const [selectedMatrixConsonant, setSelectedMatrixConsonant] = useState('ಕ');
  const [enableTransliteration, setEnableTransliteration] = useState(false);
  const [customFontUrl, setCustomFontUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const uid = useId().replace(/:/g, '');

  const metadata = useGlyphStore((s) => s.metadata);
  const updateMetadata = useGlyphStore((s) => s.updateMetadata);
  const glyphs = useGlyphStore((s) => s.glyphs);
  const activeOutlines = useUIStore((s) => s.activeOutlines);
  const selectedGoogleFont = useUIStore((s) => s.selectedGoogleFont);
  const canvasWidth = useUIStore((s) => s.canvasWidth) || 800;
  const canvasHeight = useUIStore((s) => s.canvasHeight) || 800;

  const editedGlyphs = useMemo(
    () => Object.values(glyphs).filter((g) => g.isEdited && g.paths && g.paths.length > 0),
    [glyphs]
  );
  const editedCount = editedGlyphs.length;

  // Selected Google Reference Font metadata
  const selectedFontDef = useMemo(() => {
    return (
      KANNADA_GOOGLE_FONTS.find((f) => f.id === selectedGoogleFont) ||
      KANNADA_GOOGLE_FONTS[0]
    );
  }, [selectedGoogleFont]);

  // When user has edited glyphs, compile custom font containing those specific glyphs
  useEffect(() => {
    if (!isOpen) return;

    if (editedCount === 0) {
      setCustomFontUrl(null);
      return;
    }

    let isCancelled = false;

    compileFontAsync(metadata, glyphs, activeOutlines, {
      canvasWidth,
      canvasHeight,
      fontId: selectedGoogleFont,
    })
      .then((font) => {
        if (isCancelled) return;
        const buffer = font.toArrayBuffer();
        const blob = new Blob([buffer], { type: 'font/ttf' });
        const url = URL.createObjectURL(blob);
        setCustomFontUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch((e) => {
        if (isCancelled) return;
        console.warn('Failed compiling custom font from base, using standalone fallback:', e);
        try {
          const font = compileFontStandalone(metadata, glyphs, activeOutlines, {
            canvasWidth,
            canvasHeight,
          });
          const buffer = font.toArrayBuffer();
          const blob = new Blob([buffer], { type: 'font/ttf' });
          const url = URL.createObjectURL(blob);
          setCustomFontUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } catch (err) {
          console.warn('Failed compiling custom glyph overlay:', err);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, metadata, glyphs, activeOutlines, editedCount, canvasWidth, canvasHeight, selectedGoogleFont]);

  const customUnicodeRanges = useMemo(() => {
    if (editedGlyphs.length === 0) return '';
    return editedGlyphs.map((g) => g.unicode.replace('U+', 'U+')).join(', ');
  }, [editedGlyphs]);

  const insertChar = (char: string) => {
    setTypedText((prev) => prev + char);
  };

  const handleBackspace = () => {
    setTypedText((prev) => prev.slice(0, -1));
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(typedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawVal = e.target.value;
    if (enableTransliteration) {
      const converted = transliterateEnglishToKannada(rawVal);
      setTypedText(converted);
    } else {
      setTypedText(rawVal);
    }
  };

  if (!isOpen) return null;

  const customFontFamily = `LiveLipiCustomGlyphs_${uid}`;
  const baseFontFile = `/fonts/${selectedFontDef.fileName || 'NotoSansKannada.ttf'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 md:p-6 select-none animate-fadeIn">
      {/* Indic CTL Font-Face Architecture */}
      <style>{`
        @font-face {
          font-family: 'LiveLipiBaseFont';
          src: url('${baseFontFile}') format('truetype');
          font-weight: 100 900;
        }
        ${
          customFontUrl && customUnicodeRanges
            ? `
        @font-face {
          font-family: '${customFontFamily}';
          src: url('${customFontUrl}') format('truetype');
          font-weight: ${metadata.weightClass || 400};
          unicode-range: ${customUnicodeRanges};
        }`
            : ''
        }
        .font-live-preview {
          font-family: ${
            customFontUrl ? `'${customFontFamily}', ` : ''
          }'LiveLipiBaseFont', 'Anek Kannada', 'Noto Sans Kannada', sans-serif;
          font-weight: ${metadata.weightClass || 400};
          font-feature-settings: "blwf" 1, "akhn" 1, "rphf" 1, "abvs" 1, "blws" 1, "psts" 1, "haln" 1, "kern" 1;
          font-variant-ligatures: normal;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>

      <div className="w-full max-w-6xl h-[88vh] bg-white border border-slate-200/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* 1. Sleek, Uncluttered Header (No T Icon) */}
        <div className="px-6 py-3.5 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="font-bold text-slate-900 text-sm tracking-tight">Type Preview</h2>
            <span className="text-[11px] font-mono-code bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold border border-slate-200/60">
              {metadata.name || 'Lipi-Kannada-Font'}
            </span>
            {editedCount > 0 && (
              <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                {editedCount}/78 custom
              </span>
            )}
          </div>

          {/* Segmented View Mode Tabs */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-semibold text-slate-600">
            {[
              { id: 'typewriter', label: 'Preview', icon: Sparkles },
              { id: 'waterfall', label: 'Waterfall', icon: Layers },
              { id: 'matrix', label: 'Gunithakshara', icon: BookMarked },
              { id: 'roster', label: `Roster (${editedCount}/78)`, icon: Grid3X3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewMode(tab.id as any)}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                    active
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Window Controls */}
          <div className="flex items-center gap-2.5">
            {/* Theme switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setPaperTheme('white')}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] cursor-pointer transition-all',
                  paperTheme === 'white'
                    ? 'bg-white text-slate-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setPaperTheme('parchment')}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] cursor-pointer transition-all',
                  paperTheme === 'parchment'
                    ? 'bg-[#fcfaf5] text-amber-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Parchment
              </button>
              <button
                type="button"
                onClick={() => setPaperTheme('dark')}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] cursor-pointer transition-all',
                  paperTheme === 'dark'
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Dark
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Single Unified Typographic Toolbar: Clean, perfectly fitting controls */}
        <div className="px-6 py-2 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-3 text-xs shrink-0 relative z-20">
          {/* Left: Typographic Controls & Inputs */}
          <div className="flex items-center gap-2 py-0.5 min-w-0">
            {/* Sample Presets Dropdown */}
            <div className="relative shrink-0">
              <select
                onChange={(e) => {
                  const preset = SAMPLE_PRESETS.find((p) => p.label === e.target.value);
                  if (preset) setTypedText(preset.text);
                }}
                defaultValue=""
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs pr-6 appearance-none max-w-[150px] truncate"
              >
              <option value="" disabled>
                Sample Phrases ▾
              </option>
              {SAMPLE_PRESETS.map((p, idx) => (
                <option key={idx} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-0.5 shrink-0" />

          {/* Weight Select */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
            <span className="text-slate-400 font-semibold text-[11px]">Weight</span>
            <select
              value={metadata.weightClass || 400}
              onChange={(e) => {
                const val = Number(e.target.value);
                const weightsMap: Record<number, string> = {
                  100: 'Thin',
                  300: 'Light',
                  400: 'Regular',
                  500: 'Medium',
                  600: 'SemiBold',
                  700: 'Bold',
                  800: 'ExtraBold',
                  900: 'Black',
                };
                updateMetadata({
                  weightClass: val,
                  weightName: weightsMap[val] || 'Regular',
                  styleName: weightsMap[val] || 'Regular',
                });
              }}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value={100}>Thin</option>
              <option value={300}>Light</option>
              <option value={400}>Regular</option>
              <option value={500}>Medium</option>
              <option value={600}>SemiBold</option>
              <option value={700}>Bold</option>
              <option value={800}>ExtraBold</option>
              <option value={900}>Black</option>
            </select>
          </div>

          {/* Alignment (Preview Mode only) */}
          {viewMode === 'typewriter' && (
            <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setTextAlign('left')}
                className={clsx(
                  'p-1 rounded-lg cursor-pointer transition-colors',
                  textAlign === 'left' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700'
                )}
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTextAlign('center')}
                className={clsx(
                  'p-1 rounded-lg cursor-pointer transition-colors',
                  textAlign === 'center' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700'
                )}
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTextAlign('right')}
                className={clsx(
                  'p-1 rounded-lg cursor-pointer transition-colors',
                  textAlign === 'right' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700'
                )}
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Typography Settings Icon Button & Unified Dropdown (Text Size, Line Height, Letter Spacing all in one) */}
          {viewMode === 'typewriter' && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowTypographyPopover(!showTypographyPopover)}
                className={clsx(
                  'p-1.5 rounded-xl border shadow-2xs transition-colors cursor-pointer flex items-center justify-center',
                  showTypographyPopover
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                )}
                title="Typography Settings (Text Size, Spacing, Line Height)"
                aria-label="Typography settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {showTypographyPopover && (
                <>
                  {/* Backdrop to close on click outside */}
                  <div
                    className="fixed inset-0 z-20 cursor-default"
                    onClick={() => setShowTypographyPopover(false)}
                  />

                  <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-30 flex flex-col gap-3.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        Typography
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFontSize(48);
                          setLineHeight(1.35);
                          setLetterSpacing(0);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        title="Reset to default typography values"
                      >
                        Reset
                      </button>
                    </div>

                    {/* 1. Text Size */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Text Size</span>
                        <span className="font-mono-code font-bold text-indigo-600 text-[11px] bg-indigo-50 px-1.5 py-0.5 rounded">
                          {fontSize}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="128"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <div className="flex items-center gap-1 pt-0.5">
                        {[24, 36, 48, 64, 72].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFontSize(s)}
                            className={clsx(
                              'flex-1 py-0.5 rounded text-[10px] font-mono-code transition-colors cursor-pointer border',
                              fontSize === s
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Line Height */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Line Height</span>
                        <span className="font-mono-code font-bold text-indigo-600 text-[11px] bg-indigo-50 px-1.5 py-0.5 rounded">
                          {lineHeight}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="2.4"
                        step="0.05"
                        value={lineHeight}
                        onChange={(e) => setLineHeight(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-code">
                        <span>Compact (1.0)</span>
                        <span>Normal (1.35)</span>
                        <span>Loose (2.4)</span>
                      </div>
                    </div>

                    {/* 3. Letter Spacing */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Letter Spacing</span>
                        <span className="font-mono-code font-bold text-indigo-600 text-[11px] bg-indigo-50 px-1.5 py-0.5 rounded">
                          {letterSpacing}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-2"
                        max="20"
                        step="1"
                        value={letterSpacing}
                        onChange={(e) => setLetterSpacing(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-code">
                        <span>-2px</span>
                        <span>0px</span>
                        <span>+20px</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Smart Phonetic Transliteration Toggle */}
          <button
            type="button"
            onClick={() => setEnableTransliteration(!enableTransliteration)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0',
              enableTransliteration
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            )}
            title="Type English words (e.g. 'kannada') to get Kannada ('ಕನ್ನಡ')"
          >
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                enableTransliteration ? 'bg-amber-500' : 'bg-slate-300'
              )}
            />
            <span>Phonetic IME</span>
          </button>

          {/* Virtual Keypad Toggle Button */}
          <button
            type="button"
            onClick={() => setShowKeypad(!showKeypad)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0',
              showKeypad
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            )}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Keypad</span>
          </button>
        </div>

        {/* Right: Permanently Fixed Copy and Clear Group (Never moves, jumps, or wraps) */}
        <div className="flex items-center gap-2 shrink-0 border-l border-slate-200/80 pl-3">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Copy typed text to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTypedText('')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Clear text"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
            <span>Clear</span>
          </button>
        </div>
      </div>

        {/* 3. Main Stage: Focused, Spacious & Distraction-free */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* View 1: Typewriter Mode */}
          {viewMode === 'typewriter' && (
            <div
              className={clsx(
                'flex-1 flex flex-col p-6 overflow-hidden transition-colors',
                paperTheme === 'white' && 'bg-white text-slate-900',
                paperTheme === 'parchment' && 'bg-[#fcfaf5] text-amber-950',
                paperTheme === 'dark' && 'bg-slate-950 text-slate-100'
              )}
            >
              <textarea
                value={typedText}
                onChange={handleTextChange}
                placeholder="ಕನ್ನಡದಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ..."
                className={clsx(
                  'flex-1 w-full p-4 rounded-2xl border-0 transition-all font-live-preview select-text resize-none outline-none',
                  paperTheme === 'white' && 'bg-transparent text-slate-900 placeholder:text-slate-300',
                  paperTheme === 'parchment' && 'bg-transparent text-amber-950 placeholder:text-amber-800/30',
                  paperTheme === 'dark' && 'bg-transparent text-slate-50 placeholder:text-slate-700'
                )}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  letterSpacing: `${letterSpacing}px`,
                  textAlign: textAlign,
                }}
              />

              {/* Minimal Bottom Metric Bar */}
              <div
                className={clsx(
                  'flex items-center justify-between text-xs pt-3 border-t shrink-0 select-none',
                  paperTheme === 'dark'
                    ? 'border-slate-800 text-slate-500'
                    : 'border-slate-100 text-slate-400'
                )}
              >
                <div className="flex items-center gap-3">
                  <span>
                    Characters: <strong className={paperTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>{typedText.length}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Words:{' '}
                    <strong className={paperTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                      {typedText.trim() ? typedText.trim().split(/\s+/).length : 0}
                    </strong>
                  </span>
                  <span>•</span>
                  <span className="text-indigo-600 font-medium">HarfBuzz DirectWrite CTL</span>
                </div>

                <div className="flex items-center gap-2">
                  <span>OpenType 1000 UPM</span>
                  <span>•</span>
                  <span>Kannada Unicode 15.1</span>
                </div>
              </div>
            </div>
          )}

          {/* View 2: Waterfall Mode */}
          {viewMode === 'waterfall' && (
            <div
              className={clsx(
                'flex-1 p-8 overflow-y-auto flex flex-col gap-6 transition-colors',
                paperTheme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
              )}
            >
              {WATERFALL_TIERS.map(({ size, label }) => (
                <div
                  key={size}
                  className={clsx(
                    'flex flex-col gap-1.5 border-b pb-5 transition-colors',
                    paperTheme === 'dark' ? 'border-slate-800' : 'border-slate-200/80'
                  )}
                >
                  <span className="font-mono-code text-[11px] font-semibold text-slate-400">
                    {label}
                  </span>
                  <div
                    className="font-live-preview break-words leading-tight"
                    style={{ fontSize: `${size}px` }}
                  >
                    {typedText || 'ಕನ್ನಡ ಲಿಪಿ ನುಡಿ • ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ!'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View 3: Gunithakshara Matra Matrix */}
          {viewMode === 'matrix' && (
            <div
              className={clsx(
                'flex-1 p-6 overflow-y-auto flex flex-col gap-5 transition-colors',
                paperTheme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
              )}
            >
              {/* Consonant Selector Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {GUNITHAKSHARA_CONSONANTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedMatrixConsonant(c)}
                    className={clsx(
                      'min-w-9 h-9 rounded-xl font-live-preview text-lg font-bold transition-all cursor-pointer border shadow-2xs',
                      selectedMatrixConsonant === c
                        ? 'bg-indigo-600 border-indigo-700 text-white scale-105 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-400'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* 16-Matra Grid for selected consonant */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                {MATRA_SIGNS.map((m) => {
                  const syllable = selectedMatrixConsonant + m.sign;
                  return (
                    <div
                      key={m.name}
                      onClick={() => insertChar(syllable)}
                      className={clsx(
                        'flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer group shadow-2xs',
                        paperTheme === 'dark'
                          ? 'bg-slate-900 border-slate-800 hover:border-indigo-500'
                          : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md'
                      )}
                      title={`Click to insert ${syllable} into editor`}
                    >
                      <span className="font-mono-code text-[10px] text-slate-400 mb-2 font-medium">
                        {m.name}
                      </span>
                      <span className="font-live-preview text-5xl text-slate-900 group-hover:text-indigo-600 transition-colors my-2">
                        {syllable}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        + Insert
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View 4: Complete Kannada Character Roster */}
          {viewMode === 'roster' && (
            <div
              className={clsx(
                'flex-1 p-6 overflow-y-auto transition-colors',
                paperTheme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
              )}
            >
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
                {KANNADA_CHARACTERS_LIST.map((item) => {
                  const userGlyph = glyphs[item.unicode];
                  const hasCustom = Boolean(userGlyph && userGlyph.paths && userGlyph.paths.length > 0);

                  return (
                    <button
                      key={item.unicode}
                      type="button"
                      onClick={() => insertChar(item.character)}
                      className={clsx(
                        'flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer relative group shadow-2xs',
                        hasCustom
                          ? 'bg-indigo-50/80 border-indigo-300 hover:border-indigo-500'
                          : paperTheme === 'dark'
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-600'
                          : 'bg-white border-slate-200 hover:border-slate-400'
                      )}
                      title={`Click to append ${item.character} (${item.name})`}
                    >
                      {hasCustom && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-indigo-200" />
                      )}
                      <span className="font-live-preview text-3xl mb-1 text-slate-900">
                        {item.character}
                      </span>
                      <span className="text-[10px] font-mono-code text-slate-400 font-medium">
                        {item.unicode.replace('U+', '')}
                      </span>
                      <span
                        className={clsx(
                          'text-[9px] font-bold mt-0.5 px-1 rounded',
                          hasCustom ? 'text-indigo-600 bg-indigo-100/90' : 'text-slate-400'
                        )}
                      >
                        {hasCustom ? 'Custom' : 'Base'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Sleek Collapsible Virtual Keypad Drawer */}
          {showKeypad && (
            <div className="border-t border-slate-200 bg-slate-50/90 p-3 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveKeypadTab('vowels')}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
                      activeKeypadTab === 'vowels'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                    )}
                  >
                    ಸ್ವರ (Vowels)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveKeypadTab('consonants')}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
                      activeKeypadTab === 'consonants'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                    )}
                  >
                    ವ್ಯಂಜನ (Consonants)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveKeypadTab('matras')}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
                      activeKeypadTab === 'matras'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                    )}
                  >
                    ಮಾತ್ರೆ (Matras)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveKeypadTab('conjuncts')}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
                      activeKeypadTab === 'conjuncts'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                    )}
                  >
                    ಒತ್ತಕ್ಷರ (Conjuncts)
                  </button>
                </div>

                {/* Utility Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => insertChar(' ')}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    title="Insert Space"
                  >
                    <Space className="w-3.5 h-3.5" />
                    <span>Space</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertChar('\n')}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    title="Insert New Line"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    <span>Enter</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer shadow-2xs"
                    title="Backspace"
                  >
                    <Delete className="w-3.5 h-3.5" />
                    <span>Backspace</span>
                  </button>
                </div>
              </div>

              {/* Characters Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {activeKeypadTab === 'vowels' &&
                  KEYPAD_CATEGORIES.vowels.map(({ char, name }) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => insertChar(char)}
                      className="min-w-10 h-10 px-2 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-sm font-live-preview font-bold text-slate-900 transition-transform active:scale-95 cursor-pointer shadow-2xs flex flex-col items-center justify-center shrink-0"
                    >
                      <span>{char}</span>
                      <span className="text-[8px] font-mono-code text-slate-400 -mt-1">{name}</span>
                    </button>
                  ))}

                {activeKeypadTab === 'consonants' &&
                  KEYPAD_CATEGORIES.consonants.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => insertChar(ch)}
                      className="min-w-9 h-10 px-1.5 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-sm font-live-preview font-bold text-slate-900 transition-transform active:scale-95 cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                    >
                      {ch}
                    </button>
                  ))}

                {activeKeypadTab === 'matras' &&
                  KEYPAD_CATEGORIES.matras.map(({ char, name }) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => insertChar(char)}
                      className="min-w-14 h-10 px-2 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-sm font-live-preview font-bold text-slate-900 transition-transform active:scale-95 cursor-pointer shadow-2xs flex flex-col items-center justify-center shrink-0"
                    >
                      <span className="text-base text-indigo-700 leading-none">{char}</span>
                      <span className="text-[8px] text-slate-500 -mt-0.5 truncate max-w-[50px]">
                        {name}
                      </span>
                    </button>
                  ))}

                {activeKeypadTab === 'conjuncts' &&
                  KEYPAD_CATEGORIES.conjuncts.map(({ char, name }) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => insertChar(char)}
                      className="min-w-12 h-10 px-2.5 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-sm font-live-preview font-bold text-slate-900 transition-transform active:scale-95 cursor-pointer shadow-2xs flex flex-col items-center justify-center shrink-0"
                    >
                      <span className="text-sm font-bold text-indigo-600">{char}</span>
                      <span className="text-[8px] font-mono-code text-slate-400 -mt-0.5">{name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
