/**
 * EOS Sacred Design System & Aesthetic Color Alchemy
 * Clean Hexagonal Architecture · Layer 0 Pure Domain Model
 * Zero External Dependencies (Node stdlib / pure TypeScript only)
 * Inspired by the timeless aesthetic perfection of AGEAC & @AGEACmedia
 */

export interface ColorRGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface ColorToken {
  readonly name: string;
  readonly hex: string;
  readonly rgb: ColorRGB;
  readonly role: string;
  readonly description: string;
}

export interface TypographyToken {
  readonly family: string;
  readonly category: 'EPIGRAPHIC_ROMAN_SERIF' | 'GEOMETRIC_HIGH_LEGIBILITY_SANS' | 'MONOSPACED_TERMINAL';
  readonly proportions: string;
  readonly usage: string;
}

export interface SacredAphorism {
  readonly latin: string;
  readonly translation: string;
  readonly sage: string;
}

export class SacredDesignSystem {
  public static readonly PHI = 1.618033988749895; // Golden Ratio

  /**
   * Official AGEAC Sacred Color Alchemy Palette
   */
  public static readonly PALETTE = {
    // Primary Institutional Anchor: Spiritual devotion, sacrifice, ancient mystery
    SACRED_BURGUNDY: {
      name: 'Sacred Burgundy',
      hex: '#962733',
      rgb: { r: 150, g: 39, b: 51 },
      role: 'PRIMARY_BRAND',
      description: 'Institutional anchor of dignity, ancestral gravity and spiritual solemnity'
    },
    // Darker Shade of Burgundy
    DEEP_WINE: {
      name: 'Deep Wine',
      hex: '#6B121C',
      rgb: { r: 107, g: 18, b: 28 },
      role: 'DEEP_ACCENT',
      description: 'Deep sanctuary crimson for high-contrast borders and heavy cards'
    },
    // Solar Wisdom: Illumination, incorruptibility, divine logos
    ANTIQUE_SOLAR_GOLD: {
      name: 'Antique Solar Gold',
      hex: '#C59B27',
      rgb: { r: 197, g: 155, b: 39 },
      role: 'SOLAR_ACCENT',
      description: 'Wisdom, sacred illumination, and solar consciousness'
    },
    // Radiant Gold Accent
    BRIGHT_GOLD: {
      name: 'Bright Gold',
      hex: '#D4AF37',
      rgb: { r: 212, g: 175, b: 55 },
      role: 'HIGHLIGHT_GOLD',
      description: 'Radiant gold highlights, icon contours, and illuminated title borders'
    },
    // Primordial Cosmic Void: Infinite contrast, depth, Pleroma / Ain Soph
    COSMIC_OBSIDIAN: {
      name: 'Cosmic Obsidian',
      hex: '#080D14',
      rgb: { r: 8, g: 13, b: 20 },
      role: 'BACKGROUND_VOID',
      description: 'Deepest cosmic void background providing absolute visual stillness'
    },
    // Midground Night Surface
    MIDNIGHT_SURFACE: {
      name: 'Midnight Surface',
      hex: '#121824',
      rgb: { r: 18, g: 24, b: 36 },
      role: 'SURFACE_CARD',
      description: 'Refined dark card background with subtle indigo-slate undertones'
    },
    // Natural Humanistic Parchment: Warm, glare-free readability
    SACRED_PARCHMENT: {
      name: 'Sacred Parchment',
      hex: '#FBF9F4',
      rgb: { r: 251, g: 249, b: 244 },
      role: 'TEXT_PRIMARY',
      description: 'Soft warm alabaster text eliminating blue-light digital fatigue'
    },
    // Solar Flame Ember: Living fire, active vital energy
    TERRACOTTA_EMBER: {
      name: 'Terracotta Ember',
      hex: '#C05621',
      rgb: { r: 192, g: 86, b: 33 },
      role: 'DYNAMIC_PULSE',
      description: 'Living transformative fire for interactive hover states and focal markers'
    }
  } as const;

  /**
   * Classical Typographical Epigraphy
   */
  public static readonly TYPOGRAPHY: readonly TypographyToken[] = [
    {
      family: 'Cinzel, Cormorant Garamond, "Times New Roman", serif',
      category: 'EPIGRAPHIC_ROMAN_SERIF',
      proportions: 'Trajan / Delphi Monumental Epigraphy (Letter-spacing: 0.12em)',
      usage: 'Monumental titles, philosophical axioms, chapter headings, solemn video title cards'
    },
    {
      family: 'Outfit, Inter, system-ui, sans-serif',
      category: 'GEOMETRIC_HIGH_LEGIBILITY_SANS',
      proportions: 'Balanced Golden Ratio (Line-height: 1.618)',
      usage: 'Body copy, technical parameters, video descriptions, subtitles and accessible metadata'
    },
    {
      family: '"JetBrains Mono", "Fira Code", monospace',
      category: 'MONOSPACED_TERMINAL',
      proportions: 'Monospaced 1:0.6',
      usage: 'Cryptographic SHA-256 hashes, DSP parameters, timestamp offsets and pipeline telemetry'
    }
  ];

  /**
   * Classical Philosophical Epigraphs (AGEAC Inscriptions)
   */
  public static readonly SACRED_APHORISMS: readonly SacredAphorism[] = [
    {
      latin: 'Ignoranti, quem portum petat, nullus suus ventus est.',
      translation: 'Ningún viento es favorable para el que no sabe a qué puerto va.',
      sage: 'Séneca'
    },
    {
      latin: 'Posside sapientiam, quia auro melior est.',
      translation: 'Poseer sabiduría es mejor que poseer oro.',
      sage: 'Proverbios'
    },
    {
      latin: 'Noli foras ire, in teipsum reddi; in interiore homine habitat veritas.',
      translation: 'No vayas fuera, entra en ti mismo: en el hombre interior habita la verdad.',
      sage: 'San Agustín'
    },
    {
      latin: 'Temet Nosce (Gnothi Seauton).',
      translation: 'Conócete a ti mismo y conocerás al universo y a los dioses.',
      sage: 'Oráculo de Delfos / Templo de Apolo'
    },
    {
      latin: 'Gris es toda teoría y verde el áureo árbol de la vida.',
      translation: 'Toda teoría es gris ante la experiencia directa de la conciencia despierta.',
      sage: 'Goethe'
    }
  ];

  /**
   * Converts a 6-digit hex color string to ColorRGB.
   */
  public static hexToRgb(hex: string): ColorRGB {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  /**
   * Computes the relative luminance of an sRGB color as per WCAG 2.1 specs.
   * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
   */
  public static getRelativeLuminance(rgb: ColorRGB): number {
    const srgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(val => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    const r = srgb[0] ?? 0;
    const g = srgb[1] ?? 0;
    const b = srgb[2] ?? 0;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Calculates the contrast ratio between two colors as per WCAG 2.1 specs.
   * Ratio = (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter color.
   */
  public static calculateContrastRatio(colorA: ColorRGB, colorB: ColorRGB): number {
    const lumA = this.getRelativeLuminance(colorA);
    const lumB = this.getRelativeLuminance(colorB);
    const lighter = Math.max(lumA, lumB);
    const darker = Math.min(lumA, lumB);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    return Math.round(ratio * 100) / 100;
  }

  /**
   * Evaluates if a foreground/background pair meets WCAG 2.1 AA (>= 4.5:1) or AAA (>= 7.0:1).
   */
  public static evaluateWcagCompliance(
    fg: ColorRGB,
    bg: ColorRGB,
    isLargeText: boolean = false
  ): { ratio: number; passAA: boolean; passAAA: boolean } {
    const ratio = this.calculateContrastRatio(fg, bg);
    const thresholdAA = isLargeText ? 3.0 : 4.5;
    const thresholdAAA = isLargeText ? 4.5 : 7.0;

    return {
      ratio,
      passAA: ratio >= thresholdAA,
      passAAA: ratio >= thresholdAAA
    };
  }

  /**
   * Calculates dimensions adhering to the Golden Ratio for video frames or card layouts.
   */
  public static calculateGoldenDimensions(baseWidth: number): { width: number; height: number } {
    return {
      width: Math.round(baseWidth),
      height: Math.round(baseWidth / this.PHI)
    };
  }
}
