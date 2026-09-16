import { CellObservation, GeolocationEstimate, CellRecord } from './types.js';
import { OpenCellIdProvider } from './providers/opencellid.js';
import { IchnaeaProvider } from './providers/ichnaea.js';

export class GeolocationEngine {
  private openCellId: OpenCellIdProvider;
  private ichnaea: IchnaeaProvider;

  constructor(openCellId?: OpenCellIdProvider, ichnaea?: IchnaeaProvider) {
    this.openCellId = openCellId || new OpenCellIdProvider();
    this.ichnaea = ichnaea || new IchnaeaProvider();
  }

  public async estimateLocation(
    observations: CellObservation[]
  ): Promise<GeolocationEstimate> {
    if (!observations || observations.length === 0) {
      throw new Error('GeolocationEngine requires at least one cell observation');
    }

    // 1. Check if observation already contains authorized GPS ground truth
    const gpsObservation = observations.find(
      (o) => o.latitude !== undefined && o.longitude !== undefined && (o.accuracy ?? 100) < 50
    );

    if (gpsObservation && gpsObservation.latitude !== undefined && gpsObservation.longitude !== undefined) {
      return {
        latitude: gpsObservation.latitude,
        longitude: gpsObservation.longitude,
        accuracyRadiusMeters: gpsObservation.accuracy || 15,
        confidence: 96,
        sources: ['Authorized Device Satellite GPS Receiver'],
        limitations: ['Direct authorized hardware sensor ground truth'],
        timestamp: gpsObservation.timestamp
      };
    }

    // 2. Query OpenCelliD for each cell
    const cellTowerPromises = observations.map((o) =>
      this.openCellId.getCellPosition({
        mcc: o.mcc,
        mnc: o.mnc,
        lac: o.lac,
        cellId: o.cellId,
        radio: o.radio
      })
    );

    const cellTowers = (await Promise.all(cellTowerPromises)).filter(
      (c): c is CellRecord => c !== null
    );

    // 3. Query Ichnaea RF Triangulation
    const ichnaeaInput = observations.map((o) => ({
      radioType: o.radio,
      mobileCountryCode: o.mcc,
      mobileNetworkCode: o.mnc,
      locationAreaCode: o.lac,
      cellId: o.cellId,
      signalStrength: o.signalStrengthDbm,
      timingAdvance: o.timingAdvance
    }));

    const ichnaeaEstimate = await this.ichnaea.geolocate(ichnaeaInput);

    // 4. Ensemble Fusion: Combine OpenCelliD towers and Ichnaea estimate
    if (cellTowers.length > 0) {
      let sumLat = 0;
      let sumLon = 0;
      let totalWeight = 0;

      for (const tower of cellTowers) {
        // Towers with smaller reported range have tighter spatial constraint -> higher weight
        const weight = 1 / Math.max(200, tower.rangeMeters);
        sumLat += tower.latitude * weight;
        sumLon += tower.longitude * weight;
        totalWeight += weight;
      }

      // Add Ichnaea weighted estimate to the fusion
      const ichnaeaWeight = 1 / Math.max(300, ichnaeaEstimate.accuracyRadiusMeters);
      sumLat += ichnaeaEstimate.latitude * ichnaeaWeight;
      sumLon += ichnaeaEstimate.longitude * ichnaeaWeight;
      totalWeight += ichnaeaWeight;

      const fusedLat = sumLat / totalWeight;
      const fusedLon = sumLon / totalWeight;

      // Estimate accuracy radius from minimum tower range & number of observing sectors
      const minRange = Math.min(...cellTowers.map((t) => t.rangeMeters));
      const accuracyRadius = Math.max(350, Math.round(minRange / Math.sqrt(cellTowers.length + 1)));
      const confidence = Math.min(90, 60 + cellTowers.length * 8);

      return {
        latitude: Number(fusedLat.toFixed(6)),
        longitude: Number(fusedLon.toFixed(6)),
        accuracyRadiusMeters: accuracyRadius,
        confidence,
        sources: [
          'OpenCelliD Cellular Infrastructure Catalog',
          'Ichnaea RF Triangulation Model'
        ],
        limitations: [
          'Estimated position derived from public cell towers and RF signal characteristics',
          'Not equivalent to satellite GPS'
        ],
        attribution: `${OpenCellIdProvider.ATTRIBUTION}`,
        timestamp: new Date().toISOString()
      };
    }

    // If OpenCelliD had no records, return Ichnaea estimate alone
    return ichnaeaEstimate;
  }
}
