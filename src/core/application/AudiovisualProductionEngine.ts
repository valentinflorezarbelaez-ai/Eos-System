/**
 * EOS Audiovisual Production Engine (AudiovisualProductionEngine.ts)
 * Clean Hexagonal Application Layer (0 External Runtime Dependencies)
 * Synthesizes production-grade blueprints adhering to the @AGEACmedia aesthetic standard.
 */

import { SacredDesignSystem, SacredAphorism } from '../domain/models/SacredDesignSystem.js';
import { CryptoService } from '../../infrastructure/CryptoService.js';

export interface VideoResolutionSpec {
  readonly standard: '4K_UHD' | '1080P_FULL_HD';
  readonly width: number;
  readonly height: number;
  readonly frameRate: 24 | 60;
  readonly colorSpace: 'Rec.709' | 'Rec.2020_HDR';
  readonly codec: string;
}

export interface AcousticDspProfile {
  readonly concertPitchHz: number;
  readonly solfeggioResonanceHz: number;
  readonly integratedLoudnessLufs: number;
  readonly maxTruePeakDbTp: number;
  readonly voiceoverEqSettings: {
    readonly highPassCutoffHz: number;
    readonly proximityWarmthHz: number;
    readonly proximityBoostDb: number;
    readonly deEssingCutoffHz: number;
    readonly deEssingAttenuationDb: number;
    readonly airPresenceHz: number;
    readonly airBoostDb: number;
  };
  readonly backgroundAmbienceDuckingDb: number;
  readonly ambienceReleaseMs: number;
}

export interface ColorGradingLutDirective {
  readonly profileName: string;
  readonly shadowHue: string;
  readonly midtoneWarmth: string;
  readonly highlightGold: string;
  readonly blackLevelFloor: number;
  readonly description: string;
}

export interface ThumbnailLayoutSpec {
  readonly typography: string;
  readonly titleColorHex: string;
  readonly accentColorHex: string;
  readonly backgroundColorHex: string;
  readonly focalPointRule: string;
  readonly epigraphRibbon: string;
  readonly contrastRatio: number;
  readonly wcagCompliant: boolean;
}

export interface NarrationMovement {
  readonly phaseName: string;
  readonly purpose: string;
  readonly pacingCadence: string;
  readonly musicalDynamic: string;
}

export interface AudiovisualBlueprint {
  readonly projectTitle: string;
  readonly slug: string;
  readonly resolution: VideoResolutionSpec;
  readonly acoustics: AcousticDspProfile;
  readonly colorGrading: ColorGradingLutDirective;
  readonly thumbnail: ThumbnailLayoutSpec;
  readonly narrationStructure: readonly NarrationMovement[];
  readonly sacredAphorism: SacredAphorism;
  readonly sha256Attestation: string;
  readonly createdAt: string;
}

export class AudiovisualProductionEngine {
  private readonly cryptoService: CryptoService;

  constructor(cryptoService?: CryptoService) {
    this.cryptoService = cryptoService || new CryptoService();
  }

  /**
   * Synthesizes a complete AGEAC-grade Audiovisual Production Blueprint for any topic or video concept.
   */
  public generateBlueprint(title: string, customAphorismIndex?: number): AudiovisualBlueprint {
    const cleanTitle = title.trim();
    const slug = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const aphorisms = SacredDesignSystem.SACRED_APHORISMS;
    const defaultAphorism: SacredAphorism = aphorisms[0] ?? {
      latin: 'Posside sapientiam, quia auro melior est.',
      translation: 'Poseer sabiduría es mejor que poseer oro.',
      sage: 'Proverbios'
    };
    const selectedAphorism: SacredAphorism = (customAphorismIndex !== undefined && customAphorismIndex >= 0 && customAphorismIndex < aphorisms.length)
      ? (aphorisms[customAphorismIndex] ?? defaultAphorism)
      : (aphorisms[Math.abs(cleanTitle.length) % aphorisms.length] ?? defaultAphorism);

    const goldRgb = SacredDesignSystem.PALETTE.ANTIQUE_SOLAR_GOLD.rgb;
    const obsidianRgb = SacredDesignSystem.PALETTE.COSMIC_OBSIDIAN.rgb;
    const contrast = SacredDesignSystem.calculateContrastRatio(goldRgb, obsidianRgb);

    const blueprint: Omit<AudiovisualBlueprint, 'sha256Attestation'> = {
      projectTitle: cleanTitle,
      slug,
      resolution: {
        standard: '4K_UHD',
        width: 3840,
        height: 2160,
        frameRate: 60,
        colorSpace: 'Rec.709',
        codec: 'ProRes 422 HQ / H.265 10-bit High Profile'
      },
      acoustics: {
        concertPitchHz: 432,
        solfeggioResonanceHz: 528,
        integratedLoudnessLufs: -14.0,
        maxTruePeakDbTp: -1.0,
        voiceoverEqSettings: {
          highPassCutoffHz: 80,
          proximityWarmthHz: 200,
          proximityBoostDb: 1.5,
          deEssingCutoffHz: 6200,
          deEssingAttenuationDb: -3.5,
          airPresenceHz: 12000,
          airBoostDb: 1.0
        },
        backgroundAmbienceDuckingDb: -22.0,
        ambienceReleaseMs: 250
      },
      colorGrading: {
        profileName: 'AGEAC Alchemical Sacred Grade v2.1',
        shadowHue: '#080D14 (Deep Cosmic Obsidian)',
        midtoneWarmth: '#962733 (Imperial Sacred Burgundy)',
        highlightGold: '#D4AF37 (Solar Luminescence)',
        blackLevelFloor: 0.02,
        description: 'Immaculate high-contrast grade: zero crushed noise, luminous solar warm midtones, sovereign dignity'
      },
      thumbnail: {
        typography: SacredDesignSystem.TYPOGRAPHY[0]?.family ?? 'Cinzel, serif',
        titleColorHex: SacredDesignSystem.PALETTE.BRIGHT_GOLD.hex,
        accentColorHex: SacredDesignSystem.PALETTE.SACRED_BURGUNDY.hex,
        backgroundColorHex: SacredDesignSystem.PALETTE.COSMIC_OBSIDIAN.hex,
        focalPointRule: 'Golden Ratio focal alignment (38.2% from top, central vertical axis)',
        epigraphRibbon: `"${selectedAphorism.latin}" — ${selectedAphorism.sage}`,
        contrastRatio: contrast,
        wcagCompliant: contrast >= 4.5
      },
      narrationStructure: [
        {
          phaseName: 'I. Exordium (Axioma Solemne)',
          purpose: 'Establecer la solemnidad del misterio con la cita filosófica clásica y campana o cuenco tibetano a 432 Hz.',
          pacingCadence: 'Pausa de 3 segundos entre frases. Respiración profunda y tono grave y cálido.',
          musicalDynamic: 'Drone orquestal suave en tono Re (D) a 432 Hz a -26 dB.'
        },
        {
          phaseName: 'II. Propositio (El Enigma Universal)',
          purpose: 'Plantear el gran interrogante humano: ¿Quiénes somos? ¿Para qué existimos? El laberinto de las teorías mecánicas.',
          pacingCadence: 'Cadencia socrática reflexiva, articulación clara, dicción limpia sin sibilancias.',
          musicalDynamic: 'Entrada progresiva de cuerdas graves y atmósfera de misterio.'
        },
        {
          phaseName: 'III. Refutatio (La Ilusión del Raciocinio)',
          purpose: 'Deconstruir la multiplicidad del ego y el error de buscar fuera lo que reside en el interior del hombre.',
          pacingCadence: 'Firmeza dialéctica sin estridencia, serenidad y peso de la verdad objetiva.',
          musicalDynamic: 'Disminución armónica; espacio acústico abierto para máxima inteligibilidad vocal.'
        },
        {
          phaseName: 'IV. Confirmatio (La Sabiduría Universal)',
          purpose: 'Exponer la clave del despertar: autoobservación íntima, muerte psicológica del defecto, gnosis práctica.',
          pacingCadence: 'Inspiración ascendente, ritmo constante y reverente.',
          musicalDynamic: 'Crescendo armónico con coros sagrados y resonancia armónica en 528 Hz.'
        },
        {
          phaseName: 'V. Peroratio (Llamado a la Conciencia)',
          purpose: 'Conclusión trascendental: invitación a encender la llama interior y perseverar en la búsqueda de la verdad.',
          pacingCadence: 'Pausa final de 5 segundos con el eco de la enseñanza y desvanecimiento en silencio.',
          musicalDynamic: 'Resolución armónica en acorde mayor y decrescendo suave hasta el silencio absoluto.'
        }
      ],
      sacredAphorism: selectedAphorism,
      createdAt: new Date().toISOString()
    };

    const payload = `${blueprint.projectTitle}:${blueprint.resolution.standard}:${blueprint.acoustics.concertPitchHz}:${blueprint.createdAt}`;
    const hash = this.cryptoService.hashString(payload);

    return {
      ...blueprint,
      sha256Attestation: hash
    };
  }

  /**
   * Generates a readable markdown dossier of the blueprint for human review and video editors.
   */
  public formatBlueprintToMarkdown(bp: AudiovisualBlueprint): string {
    return `# DOSSIER TÉCNICO AUDIOVISUAL: ${bp.projectTitle.toUpperCase()}
## Estándar de Perfección Estética AGEAC & @AGEACmedia
* **Atestación Criptográfica:** \`${bp.sha256Attestation}\`
* **Fecha de Síntesis:** ${bp.createdAt}

---

### 1. Especificaciones de Video & Colorimetría
* **Resolución Estándar:** ${bp.resolution.standard} (${bp.resolution.width} x ${bp.resolution.height} px)
* **Cadencia de Cuadros:** ${bp.resolution.frameRate} FPS (Fluidez cinematográfica pura)
* **Espacio de Color & Códec:** ${bp.resolution.colorSpace} · ${bp.resolution.codec}
* **LUT Estético:** \`${bp.colorGrading.profileName}\`
  - Sombras: ${bp.colorGrading.shadowHue}
  - Medios: ${bp.colorGrading.midtoneWarmth}
  - Luces: ${bp.colorGrading.highlightGold}
  - Nota de Color: ${bp.colorGrading.description}

---

### 2. Calibración Acústica & DSP (Ingeniería de Sonido Sagrado)
* **Frecuencia Concierto:** **${bp.acoustics.concertPitchHz} Hz** (Armonía pitagórica natural)
* **Resonancia de Transformación:** **${bp.acoustics.solfeggioResonanceHz} Hz**
* **Nivel de Sonoridad Integrada:** **${bp.acoustics.integratedLoudnessLufs} LUFS** (Transmisión Broadcast impecable)
* **Techo True Peak:** **${bp.acoustics.maxTruePeakDbTp} dBTP**
* **Cadena de EQ y Dinámica Vocal:**
  - High-Pass Filter: Cutoff ${bp.acoustics.voiceoverEqSettings.highPassCutoffHz} Hz (Eliminación de retumbos subsónicos)
  - Calidez Proximidad: +${bp.acoustics.voiceoverEqSettings.proximityBoostDb} dB en ${bp.acoustics.voiceoverEqSettings.proximityWarmthHz} Hz
  - De-Esser Quirúrgico: ${bp.acoustics.voiceoverEqSettings.deEssingAttenuationDb} dB en ${bp.acoustics.voiceoverEqSettings.deEssingCutoffHz} Hz
  - Brillo Aéreo: +${bp.acoustics.voiceoverEqSettings.airBoostDb} dB en ${bp.acoustics.voiceoverEqSettings.airPresenceHz} Hz
* **Atenuación de Fondo (Ducking):** ${bp.acoustics.backgroundAmbienceDuckingDb} dB con ${bp.acoustics.ambienceReleaseMs} ms de release.

---

### 3. Composición de Miniatura & Jerarquía Visual (YouTube Standard)
* **Tipografía:** \`${bp.thumbnail.typography}\`
* **Color de Título:** \`${bp.thumbnail.titleColorHex}\`
* **Color de Acento:** \`${bp.thumbnail.accentColorHex}\`
* **Color de Fondo:** \`${bp.thumbnail.backgroundColorHex}\`
* **Contraste Óptico Calculado:** **${bp.thumbnail.contrastRatio}:1** (Conformidad WCAG: ${bp.thumbnail.wcagCompliant ? 'AA/AAA APROBADO' : 'FALLO'})
* **Regla de Encuadre:** ${bp.thumbnail.focalPointRule}
* **Cita Epigráfica:** ${bp.thumbnail.epigraphRibbon}

---

### 4. Estructura Dramática & Locución (5 Movimientos Clásicos)
${bp.narrationStructure.map(m => `#### ${m.phaseName}
* **Objetivo:** ${m.purpose}
* **Cadencia:** ${m.pacingCadence}
* **Dinámica Sonora:** ${m.musicalDynamic}`).join('\n\n')}

---
*Fin del Dossier de Producción Audiovisual EOS 2.1.*
`;
  }
}
