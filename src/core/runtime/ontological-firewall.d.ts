export interface IntentInspectionOptions {
  nodeId?: string;
  transientBuffer?: { fill(value: number): any };
}

export interface IntentInspectionResult {
  status: 'ADMITTED_PRISTINE';
  intentHash: string;
  nodeId: string;
  inspectedLength: number;
}

export class OntologicalFirewall {
  /**
   * Inspecciona una carga de intenciones o prompt en busca de acechanzas conceptuales.
   * Lanza OntologicalIntrusionException si detecta subversión de invariantes.
   */
  public static inspectIntent(
    payload: Record<string, any> | string,
    options?: IntentInspectionOptions
  ): IntentInspectionResult;
}
