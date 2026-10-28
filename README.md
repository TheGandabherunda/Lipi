# ಲಿಪಿ | Lipi

> **A Professional, Browser-Based Kannada Typeface Design Studio & OpenType Font Compiler.**

[![Vitest](https://img.shields.io/badge/tests-5%20passed-success)](tests/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vite.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI & Deploy](https://github.com/TheGandabherunda/Lipi/actions/workflows/deploy.yml/badge.svg)](https://github.com/TheGandabherunda/Lipi/actions/workflows/deploy.yml)

---

## 📖 About Lipi

**Lipi** (ಲಿಪಿ — meaning *script* or *writing system* in Kannada and Sanskrit) is a web-first typeface design environment crafted specifically for the nuanced geometry of the **Kannada script**.

Designing Indic typefaces has traditionally required heavy, desktop-bound font software like FontLab or Glyphs, combined with convoluted lookup table setups for Complex Text Layout (CTL). Lipi brings the entire typeface design pipeline directly to the web browser:

1. **Draw** with precision vector bezier pens, dynamic calligraphy ribbon brushes, and segment-aware erasers.
2. **Trace** against authentic baseline references (Noto Sans Kannada, Tiro Kannada, Baloo Tamma 2, Anek Kannada, Hubballi) or imported TTF/OTF fonts.
3. **Audit** against the authentic 78-glyph Kannada roster, including Swaras, Vyanjanas, Gunithaksharas (Matras), Numbers, and Modifiers.
4. **Test** in real-time with integrated Baraha / ITRANS phonetic transliteration across waterfall scales and ligature matrices.
5. **Compile** directly in-browser into installable TrueType (`.ttf`) fonts with preserved OpenType GSUB and GPOS shaping tables.

---

## ✨ Key Features

### 🖋️ 1. Vector Illustration & Calligraphy Studio
- **Pen Tool with Bezier Precision**: Place anchor points and adjust curvature in real-time.
- **Dynamic Calligraphy Ribbon Brush**: Simulates traditional Indian reed pens (*kalam*) with angle and chisel geometry.
- **Artistic Round Brush**: Smooth freehand brush strokes with configurable tension and spline interpolation.
- **Smart Segment Eraser**: Erases exact path segments while automatically repairing subpath continuities.
- **Direct Node Selection**: Subpath-level manipulation—move individual nodes, adjust bezier handles, convert between sharp corners and smooth curves, and reverse contour orientations.

### 📐 2. Authentic Kannada Typographic Guidelines
- Coordinate metrics configured to OpenType standards (1000 UPM):
  - **Ascender line**
  - **Cap Height line**
  - **Baseline**
  - **Descender line**
  - **Center Vertical axis**
  - **Advance Width metric markers**
- Adaptive canvas sizing with fluid zoom (10% to 500%) and pan support.

### 🔤 3. 78-Glyph Kannada Master Roster
Organized into authentic script categories with advance widths extracted from native font binaries:
- **ಸ್ವರಗಳು (Swaragalu / Vowels)**: ಅ, ಆ, ಇ, ಈ, ಉ, ಊ, ಋ, ಎ, ಏ, ಐ, ಒ, ಓ, ಔ
- **ಯೋಗವಾಹಗಳು (Yogavahagalu)**: ಅಂ (Anusvara), ಅಃ (Visarga)
- **ವ್ಯಂಜನಗಳು (Vyanjanagalu / Consonants)**: ಕ, ಖ, ಗ, ಘ, ಙ, ಚ, ಛ, ಜ, ಝ, ಞ, ಟ, ಠ, ಡ, ಢ, ಣ, ತ, ಥ, ದ, ಧ, ನ, ಪ, ಫ, ಬ, ಭ, ಮ, ಯ, ರ, ಲ, ವ, ಶ, ಷ, ಸ, ಹ, ಳ
- **ಗುಣಿತಾಕ್ಷರ ಚಿಹ್ನೆಗಳು (Gunithakshara / Matras)**: ಾ, ಿ, ೀ, ು, ೂ, ೃ, ೆ, ೇ, ೈ, ೊ, ೋ, ೌ, ್ (Virama)
- **ಅಂಕಿಗಳು (Numbers / Digits)**: ೦, ೧, ೨, ೩, ೪, ೫, ೬, ೭, ೮, ೯
- **ವಿಶೇಷ ಚಿಹ್ನೆಗಳು (Modifiers & Ottakshara)**: ಅರ್ಕಾವತ್ತು (Arka), ಅವಗ್ರಹ (Avagraha), etc.

### 👁️ 4. Reference Fonts & Tracing System
- Pre-loaded authentic reference typefaces:
  - **Noto Sans Kannada** (Google / Monotype)
  - **Baloo Tamma 2** (Ek Type)
  - **Tiro Kannada** (Tiro Typeworks)
  - **Anek Kannada** (Ek Type)
  - **Hubballi** (Modular display font)
- **Custom Font Importer**: Load any local `.ttf` or `.otf` file as an active reference.
- **Adjustable Tracing Modes**: Switch between high-contrast outline tracing, subtle translucent fill, or combined overlays with opacity controls (5% to 100%).

### 🧪 5. Live Type Tester & Phonetical Transliteration
- **Instant Font Compilation**: Compiles your drawn glyphs on the fly into an active WebFont without leaving the editor.
- **Baraha / ITRANS Phonetic Keyboard**: Type English on any standard keyboard to preview authentic Kannada shaping:
  - Example: `namaste` → `ನಮಸ್ತೆ`, `kannada` → `ಕನ್ನಡ`, `shubhadina` → `ಶುಭದಿನ`.
- **Waterfall Scale Preview**: Check optical balance from body sizes (12px, 16px, 24px) to display sizes (48px, 72px, 96px).
- **Gunithakshara Matrix**: Verify that vowel diacritics align consistently across consonants.
- **Roster Progress Tracker**: Real-time completion counter tracking designed vs remaining glyphs.

### 📦 6. In-Browser Font Compilation & Export
- **TrueType Font (`.ttf`)**: Preserves base font OpenType tables (GSUB ligatures & GPOS mark positioning) while replacing glyph outlines with user designs.
- **SVG Font (`.svg`)**: Web-standard SVG font definition.
- **SVG Glyphs ZIP (`.zip`)**: Individual clean SVG vector files for every glyph for use in Illustrator, Figma, or Inkscape.
- **Native Lipi Project (`.lipi`)**: Complete JSON project snapshot containing all vector paths, undo history, metrics, and metadata.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev), [Vite 8](https://vite.dev) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict mode) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) |
| **Vector Engine** | [Fabric.js v7](https://fabricjs.com), HTML5 Canvas 2D |
| **Font Parsing & Compilation**| [OpenType.js](https://opentype.js.org) |
| **State Management** | [Zustand](https://zustand.docs.pmnd.rs) (Persisted stores) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Packaging & Export** | [JSZip](https://stuk.github.io/jszip/) |
| **Linter & Quality** | [Oxlint](https://oxc.rs), [Vitest](https://vitest.dev) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20+ or v22+
- **npm**: v10+

### Installation

```bash
# 1. Clone repository
git clone https://github.com/TheGandabherunda/Lipi.git
cd Lipi

# 2. Install dependencies
npm ci
```

### Local Development Server

```bash
npm run dev
# Starts local Vite development server at http://localhost:5173
```

### Production Build

```bash
# Run type checks and build production assets to dist/
npm run build

# Preview production build locally
npm run preview
```

### Run Tests and Validation

```bash
# Run Vitest automated test suite
npm test

# Run TypeScript compiler verification
npm run type-check

# Run high-speed Oxlint linter
npm run lint
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>V</kbd> | Selection Tool |
| <kbd>A</kbd> | Direct Node Selection Tool |
| <kbd>P</kbd> | Pen Tool |
| <kbd>B</kbd> | Calligraphy / Round Brush Tool |
| <kbd>E</kbd> | Segment Eraser Tool |
| <kbd>H</kbd> / <kbd>Space + Drag</kbd> | Pan Canvas |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Cmd</kbd> + <kbd>Z</kbd> | Undo |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Redo |
| <kbd>[</kbd> / <kbd>]</kbd> | Decrease / Increase Stroke Width |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Save Project (`.lipi`) |
| <kbd>Del</kbd> / <kbd>Backspace</kbd> | Delete Selected Object or Node |

---

## 🚢 CI/CD & Deployment

This project deploys automatically to **GitHub Pages** using GitHub Actions on every push to the `main` branch.

The workflow is defined at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) and performs:
1. Clean dependency installation with `npm ci`.
2. Strict TypeScript type check via `npm run type-check`.
3. Production compilation with `npm run build` with dynamic base path mapping (`VITE_BASE_PATH`).
4. Vitest automated test suite execution with `npm test`.
5. Direct artifact upload and deployment to GitHub Pages.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- **Google Fonts** & **Monotype** for Noto Sans Kannada.
- **Ek Type** for Baloo Tamma 2 & Anek Kannada.
- **Tiro Typeworks** for Tiro Kannada.
- The open-source typographic community powering **OpenType.js** and **Fabric.js**.
