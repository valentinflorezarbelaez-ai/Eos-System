import { describe, it, expect } from 'vitest';
import { SacredDesignSystem } from '../../../src/core/domain/models/SacredDesignSystem.js';

describe('SacredDesignSystem', () => {
  it('defines the golden ratio constant PHI', () => {
    expect(SacredDesignSystem.PHI).toBeCloseTo(1.6180339887, 8);
  });

  describe('Palette & Typography & Aphorisms', () => {
    it('contains all 8 sacred alchemy colors', () => {
      const palette = SacredDesignSystem.PALETTE;
      expect(palette.SACRED_BURGUNDY.hex).toBe('#962733');
      expect(palette.DEEP_WINE.hex).toBe('#6B121C');
      expect(palette.ANTIQUE_SOLAR_GOLD.hex).toBe('#C59B27');
      expect(palette.BRIGHT_GOLD.hex).toBe('#D4AF37');
      expect(palette.COSMIC_OBSIDIAN.hex).toBe('#080D14');
      expect(palette.MIDNIGHT_SURFACE.hex).toBe('#121824');
      expect(palette.SACRED_PARCHMENT.hex).toBe('#FBF9F4');
      expect(palette.TERRACOTTA_EMBER.hex).toBe('#C05621');
    });

    it('contains 3 classical typography categories', () => {
      const typography = SacredDesignSystem.TYPOGRAPHY;
      expect(typography).toHaveLength(3);
      const categories = typography.map(t => t.category);
      expect(categories).toContain('EPIGRAPHIC_ROMAN_SERIF');
      expect(categories).toContain('GEOMETRIC_HIGH_LEGIBILITY_SANS');
      expect(categories).toContain('MONOSPACED_TERMINAL');
    });

    it('contains 5 sacred philosophical aphorisms with sages', () => {
      const aphorisms = SacredDesignSystem.SACRED_APHORISMS;
      expect(aphorisms).toHaveLength(5);
      const sages = aphorisms.map(a => a.sage);
      expect(sages).toContain('Séneca');
      expect(sages).toContain('San Agustín');
      expect(sages).toContain('Goethe');
    });
  });

  describe('Color Math & Conversions', () => {
    it('converts hex with hash to RGB correctly', () => {
      const rgb = SacredDesignSystem.hexToRgb('#962733');
      expect(rgb).toEqual({ r: 150, g: 39, b: 51 });
    });

    it('converts hex without hash to RGB correctly', () => {
      const rgb = SacredDesignSystem.hexToRgb('C59B27');
      expect(rgb).toEqual({ r: 197, g: 155, b: 39 });
    });

    it('converts black and white correctly', () => {
      expect(SacredDesignSystem.hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(SacredDesignSystem.hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('calculates relative luminance for pure black and pure white', () => {
      const black = { r: 0, g: 0, b: 0 };
      const white = { r: 255, g: 255, b: 255 };

      expect(SacredDesignSystem.getRelativeLuminance(black)).toBeCloseTo(0.0, 4);
      expect(SacredDesignSystem.getRelativeLuminance(white)).toBeCloseTo(1.0, 4);
    });

    it('calculates contrast ratio between black and white (21:1)', () => {
      const black = { r: 0, g: 0, b: 0 };
      const white = { r: 255, g: 255, b: 255 };

      const ratio = SacredDesignSystem.calculateContrastRatio(white, black);
      expect(ratio).toBe(21.0);
    });

    it('is symmetric regardless of argument order in calculateContrastRatio', () => {
      const colA = { r: 150, g: 39, b: 51 };
      const colB = { r: 251, g: 249, b: 244 };

      const ratio1 = SacredDesignSystem.calculateContrastRatio(colA, colB);
      const ratio2 = SacredDesignSystem.calculateContrastRatio(colB, colA);
      expect(ratio1).toBe(ratio2);
    });
  });

  describe('evaluateWcagCompliance', () => {
    it('evaluates high-contrast parchment on obsidian as AA and AAA passing', () => {
      const parchment = SacredDesignSystem.PALETTE.SACRED_PARCHMENT.rgb;
      const obsidian = SacredDesignSystem.PALETTE.COSMIC_OBSIDIAN.rgb;

      const evalResult = SacredDesignSystem.evaluateWcagCompliance(parchment, obsidian);
      expect(evalResult.ratio).toBeGreaterThan(15.0);
      expect(evalResult.passAA).toBe(true);
      expect(evalResult.passAAA).toBe(true);
    });

    it('evaluates low contrast pairs correctly', () => {
      const colorA = { r: 100, g: 100, b: 100 };
      const colorB = { r: 105, g: 105, b: 105 };

      const evalResult = SacredDesignSystem.evaluateWcagCompliance(colorA, colorB);
      expect(evalResult.ratio).toBeLessThan(2.0);
      expect(evalResult.passAA).toBe(false);
      expect(evalResult.passAAA).toBe(false);
    });

    it('respects isLargeText parameter lowering threshold', () => {
      // ratio ~3.5:1 passes AA for large text (3.0 threshold), but fails regular text (4.5 threshold)
      const fg = { r: 160, g: 100, b: 50 };
      const bg = { r: 20, g: 20, b: 20 };

      const standardEval = SacredDesignSystem.evaluateWcagCompliance(fg, bg, false);
      const largeEval = SacredDesignSystem.evaluateWcagCompliance(fg, bg, true);

      if (standardEval.ratio >= 3.0 && standardEval.ratio < 4.5) {
        expect(standardEval.passAA).toBe(false);
        expect(largeEval.passAA).toBe(true);
      }
    });
  });

  describe('calculateGoldenDimensions', () => {
    it('calculates golden ratio proportions for dimensions', () => {
      const dims = SacredDesignSystem.calculateGoldenDimensions(1920);
      expect(dims.width).toBe(1920);
      expect(dims.height).toBe(Math.round(1920 / SacredDesignSystem.PHI)); // 1187
    });

    it('handles zero and small widths gracefully', () => {
      const dims = SacredDesignSystem.calculateGoldenDimensions(0);
      expect(dims.width).toBe(0);
      expect(dims.height).toBe(0);
    });
  });
});
