export interface WitnessCoordinate {
  subjectKernelId: string;
  objectPayloadHash: string;
  placeMemoryRegion: string;
  phaseDelta?: number;
}

export interface HydrogenRefinementResult {
  originalDensity: string;
  refinedDensity: string;
  payloadVector: string;
  witnessReceipt: string;
  thermalEntropyDelta: number;
}

export declare class EosSelfObservationWitness {
  sovereignThreadId: string;
  activeThreads: Map<string, any>;

  evaluateWitnessTriad(coordinate: WitnessCoordinate): {
    status: string;
    witnessReceipt: string;
    message: string;
  };

  transmuteHydrogen(rawPayload: string, okidanokhSeal: string): HydrogenRefinementResult;
}
