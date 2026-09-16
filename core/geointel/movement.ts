import { CellObservation, RadioType } from './types.js';

export interface CellTransition {
  fromCellId: number;
  toCellId: number;
  fromRadio: RadioType;
  toRadio: RadioType;
  timestamp: string;
}

export interface MovementSummary {
  deviceIdHash: string;
  totalObservations: number;
  uniqueCellsCount: number;
  durationSeconds: number;
  totalEstimatedDistanceMeters: number;
  transitions: CellTransition[];
  radioDistribution: Record<string, number>;
  signalStats: {
    minDbm?: number;
    maxDbm?: number;
    avgDbm?: number;
  };
}

export class MovementAnalyzer {
  private haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  public analyze(observations: CellObservation[]): MovementSummary {
    if (observations.length === 0) {
      throw new Error('MovementAnalyzer requires at least one observation');
    }

    // Sort chronologically ascending
    const sorted = [...observations].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const deviceIdHash = sorted[0].deviceIdHash;
    const uniqueCells = new Set<number>();
    const radioCounts: Record<string, number> = {};
    const transitions: CellTransition[] = [];
    const signals: number[] = [];

    let totalDist = 0;
    let prevObs: CellObservation | null = null;

    for (const obs of sorted) {
      uniqueCells.add(obs.cellId);
      radioCounts[obs.radio] = (radioCounts[obs.radio] || 0) + 1;

      if (obs.signalStrengthDbm !== undefined) {
        signals.push(obs.signalStrengthDbm);
      }

      if (prevObs) {
        // Track cell handover
        if (prevObs.cellId !== obs.cellId) {
          transitions.push({
            fromCellId: prevObs.cellId,
            toCellId: obs.cellId,
            fromRadio: prevObs.radio,
            toRadio: obs.radio,
            timestamp: obs.timestamp
          });
        }

        // Distance if both have coordinates
        if (
          prevObs.latitude !== undefined &&
          prevObs.longitude !== undefined &&
          obs.latitude !== undefined &&
          obs.longitude !== undefined
        ) {
          totalDist += this.haversineDistanceMeters(
            prevObs.latitude,
            prevObs.longitude,
            obs.latitude,
            obs.longitude
          );
        }
      }

      prevObs = obs;
    }

    const firstTime = new Date(sorted[0].timestamp).getTime();
    const lastTime = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const durationSeconds = Math.max(0, Math.round((lastTime - firstTime) / 1000));

    const signalStats = signals.length > 0
      ? {
          minDbm: Math.min(...signals),
          maxDbm: Math.max(...signals),
          avgDbm: Math.round(signals.reduce((a, b) => a + b, 0) / signals.length)
        }
      : {};

    return {
      deviceIdHash,
      totalObservations: sorted.length,
      uniqueCellsCount: uniqueCells.size,
      durationSeconds,
      totalEstimatedDistanceMeters: totalDist,
      transitions,
      radioDistribution: radioCounts,
      signalStats
    };
  }
}
