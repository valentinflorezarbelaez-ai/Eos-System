import { EARSPattern, BDDScenario } from '../types.js';

/**
 * Requirement Entity (Pure Domain)
 * Enforces IEEE 830 / ISO 29148 EARS syntax rules.
 */
export class Requirement {
  readonly id: string;
  readonly title: string;
  readonly rawText: string;
  readonly pattern: EARSPattern;
  readonly scenarios: readonly BDDScenario[];

  constructor(
    id: string,
    title: string,
    rawText: string,
    pattern: EARSPattern,
    scenarios: readonly BDDScenario[] = []
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('Requirement ID cannot be empty');
    }
    if (!title || title.trim().length === 0) {
      throw new Error('Requirement title cannot be empty');
    }
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Requirement rawText cannot be empty');
    }

    Requirement.validateEarsSyntax(rawText, pattern);

    this.id = id.trim();
    this.title = title.trim();
    this.rawText = rawText.trim();
    this.pattern = pattern;
    this.scenarios = Object.freeze([...scenarios]);
    Object.freeze(this);
  }

  /**
   * Validates EARS syntactic pattern constraints.
   */
  static validateEarsSyntax(text: string, expectedPattern: EARSPattern): void {
    const trimmed = text.trim();

    switch (expectedPattern) {
      case 'EVENT_DRIVEN':
        if (!/^WHEN\s+.+,\s+THE\s+SYSTEM\s+SHALL\s+.+$/i.test(trimmed)) {
          throw new Error(
            `Invalid EVENT_DRIVEN EARS syntax: "${trimmed}". Must follow: "WHEN <event>, THE SYSTEM SHALL <response>"`
          );
        }
        break;

      case 'STATE_DRIVEN':
        if (!/^WHILE\s+.+,\s+THE\s+SYSTEM\s+SHALL\s+.+$/i.test(trimmed)) {
          throw new Error(
            `Invalid STATE_DRIVEN EARS syntax: "${trimmed}". Must follow: "WHILE <state>, THE SYSTEM SHALL <response>"`
          );
        }
        break;

      case 'ERROR_DRIVEN':
        if (!/^IF\s+.+,\s+THEN\s+THE\s+SYSTEM\s+SHALL\s+.+$/i.test(trimmed)) {
          throw new Error(
            `Invalid ERROR_DRIVEN EARS syntax: "${trimmed}". Must follow: "IF <condition>, THEN THE SYSTEM SHALL <response>"`
          );
        }
        break;

      case 'UBIQUITOUS':
        if (!/^THE\s+SYSTEM\s+SHALL\s+.+$/i.test(trimmed)) {
          throw new Error(
            `Invalid UBIQUITOUS EARS syntax: "${trimmed}". Must follow: "THE SYSTEM SHALL <continuous behavior>"`
          );
        }
        break;

      default:
        throw new Error(`Unsupported EARS pattern: ${String(expectedPattern)}`);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      title: this.title,
      rawText: this.rawText,
      pattern: this.pattern,
      scenarios: this.scenarios
    };
  }
}
