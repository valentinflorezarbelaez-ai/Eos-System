export interface FiveCentersState {
  intellectual: number;
  emotional: number;
  motor: number;
  instinctive: number;
  creative: number;
}

export interface DashboardReport {
  status: string;
  globalHarmonyIndex: number;
  centers: FiveCentersState;
  hydrogenTransmutedVolumes: Record<string, number>;
  dashboardReceipt: string;
  backpressureActive: boolean;
}

export declare class EosOntologicalDashboard {
  goldenMaxThreshold: number;
  goldenRatioConstant: number;

  generateHarmonicReport(
    customLoads?: Partial<FiveCentersState>,
    maxThreshold?: number
  ): DashboardReport;
}
