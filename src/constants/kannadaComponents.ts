import type { FontComponent } from '../types/glyph';

/**
 * Authentic Kannada Anatomical Font Components (ಅಂಗಗಳು)
 * Pre-calibrated vector components that font designers can stamp or insert directly
 * into any glyph to speed up font creation and maintain consistent style.
 */
export const KANNADA_STANDARD_COMPONENTS: FontComponent[] = [
  {
    id: 'comp_talekattu_classic',
    name: 'Talekattu (Classic Wave)',
    nameKn: 'ತಲೆಕಟ್ಟು (ಸಾಂಪ್ರದಾಯಿಕ)',
    category: 'talekattu',
    defaultWidth: 260,
    defaultHeight: 90,
    description: 'Signature crown wave positioned at cap height for consonants (ಕ, ಗ, ಚ, ತ, ನ, ಪ, ಮ).',
    paths: [
      {
        id: 'p_talekattu_1',
        pathString: 'M 200 240 Q 250 200 320 220 Q 380 240 440 200',
        strokeWidth: 20,
        strokeColor: '#0f172a',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      },
    ],
  },
  {
    id: 'comp_talekattu_modern',
    name: 'Talekattu (Modern Sharp)',
    nameKn: 'ತಲೆಕಟ್ಟು (ಆಧುನಿಕ ನೇರ)',
    category: 'talekattu',
    defaultWidth: 240,
    defaultHeight: 70,
    description: 'Clean modern horizontal crown stroke with subtle terminal taper.',
    paths: [
      {
        id: 'p_talekattu_2',
        pathString: 'M 210 230 C 270 210 330 210 420 225',
        strokeWidth: 22,
        strokeColor: '#0f172a',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      },
    ],
  },
  {
    id: 'comp_gudisu',
    name: 'Gudisu (I-Matra)',
    nameKn: 'ಗುಡಿಸು (ಿ)',
    category: 'gudisu',
    defaultWidth: 210,
    defaultHeight: 180,
    description: 'Upper right circular arch curve indicating the short /i/ sound.',
    paths: [
      {
        id: 'p_gudisu_1',
        pathString: 'M 350 240 C 350 160 460 160 480 230 C 490 270 460 300 420 300',
        strokeWidth: 18,
        strokeColor: '#0f172a',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      },
    ],
  },
  {
    id: 'comp_gudisu_deergha',
    name: 'Gudisu Deergha (II-Matra)',
    nameKn: 'ಗುಡಿಸು ದೀರ್ಘ (ೀ)',
    category: 'gudisu',
    defaultWidth: 230,
    defaultHeight: 200,
    description: 'Upper loop with loop termination indicating the long /i:/ sound.',
    paths: [
      {
        id: 'p_gudisu_d_1',
        pathString: 'M 350 240 C 350 150 470 150 490 220 C 500 270 460 310 410 310 C 380 310 370 290 380 270 C 390 250 420 250 440 270',
        strokeWidth: 18,
        strokeColor: '#0f172a',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      },
    ],
  },
  {
    id: 'comp_kombu',
    name: 'Kombu (U-Matra)',
    nameKn: 'ಕೊಂಬು (ು)',
    category: 'kombu',
    defaultWidth: 160,
    defaultHeight: 200,
    description: 'Right-side descending curve hook for the short /u/ vowel sign.',
    paths: [
      {
        id: 'p_kombu_1',
        pathString: 'M 480 450 C 480 540 520 580 560 550 C 590 530 580 470 540 470',
        strokeWidth: 20,
        strokeColor: '#0f172a',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      },
    ],
  },
  {
    id: 'comp_kombu_deergha',
    name: 'Kombu Deergha (UU-Matra)',
    nameKn: 'ಕೊಂಬು ದೀರ್ಘ (ೂ)',
    category: 'kombu',
    defaultWidth: 190,
    defaultHeight: 240,
    description: 'Right-side double curved loop for the long /u:/ vowel sign.',
    paths: [
      {
        id: 'p_kombu_d_1',
        pathString: 'M 480 440 C 480 530 520 570 560 550 C 580 535 570 490 530 490 C 560 530 610 570 630 540',
        strokeWidth: 20,
        strokeColor: '#0f172a',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      },
    ],
  },
  {
    id: 'comp_virama',
    name: 'Virama / Halant',
    nameKn: 'ಹಲಂತ್ / ವಿರಾಮ (್)',
    category: 'virama',
    defaultWidth: 180,
    defaultHeight: 90,
    description: 'Upper right consonant muting stroke used in conjuncts and pure consonants.',
    paths: [
      {
        id: 'p_virama_1',
        pathString: 'M 360 210 Q 420 180 460 220',
        strokeWidth: 22,
        strokeColor: '#0f172a',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      },
    ],
  },
  {
    id: 'comp_vattrisuli',
    name: 'Vattrisuli (R-Matra)',
    nameKn: 'ವಟ್ರುಸುಳಿ (ೃ)',
    category: 'vattrisuli',
    defaultWidth: 160,
    defaultHeight: 180,
    description: 'Below-base spiral curl for the vocalic /r/ sign (e.g. ಕೃ, ಮೃ).',
    paths: [
      {
        id: 'p_vattrisuli_1',
        pathString: 'M 460 560 C 460 640 400 680 360 650 C 330 620 340 570 380 570 C 410 570 430 600 410 630',
        strokeWidth: 18,
        strokeColor: '#0f172a',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      },
    ],
  },
  {
    id: 'comp_base_loop',
    name: 'Base Loop (Symmetrical Arch)',
    nameKn: 'ತಳದ ಸುಳಿ (ಬ, ಲ, ದ)',
    category: 'loop',
    defaultWidth: 280,
    defaultHeight: 240,
    description: 'Rounded primary bottom curve foundational to letters like ಬ, ಲ, ದ, ರ.',
    paths: [
      {
        id: 'p_loop_1',
        pathString: 'M 220 380 C 220 540 440 540 440 380',
        strokeWidth: 20,
        strokeColor: '#0f172a',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      },
    ],
  },
];
