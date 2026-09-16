export type RadioType = 'GSM' | 'UMTS' | 'LTE' | 'NR' | 'CDMA';

export type ConsentState = 'PENDING' | 'GRANTED' | 'REVOKED' | 'EXPIRED';

export type ObservationQuality =
  | 'RAW'
  | 'VALIDATED'
  | 'LOW_CONFIDENCE'
  | 'DUPLICATE'
  | 'REJECTED';

export interface BoundingBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export interface CellRecord {
  id: string; // e.g. "opencellid:LTE:310:410:1234:56789"
  provider: string; // 'opencellid' | 'internal' | 'osm'
  mcc: number;
  mnc: number;
  lac: number;
  tac?: number;
  cellId: number;
  radio: RadioType;
  latitude: number;
  longitude: number;
  rangeMeters: number;
  samples: number;
  confidence: number; // 0 to 100
  attribution: string;
  lastSeen?: string;
  rawMetadata?: Record<string, unknown>;
}

export interface CellObservation {
  id: string;
  userId: string;
  deviceIdHash: string; // SHA-256 hash of device identity
  timestamp: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number; // meters
  mcc: number;
  mnc: number;
  lac: number;
  tac?: number;
  cellId: number;
  radio: RadioType;
  pci?: number;
  psc?: number;
  signalStrengthDbm?: number;
  timingAdvance?: number;
  source: 'neostumbler' | 'hikmah_mobile' | 'manual';
  fingerprint: string;
  quality: ObservationQuality;
  metadata?: Record<string, unknown>;
}

export interface GeolocationEstimate {
  latitude: number;
  longitude: number;
  accuracyRadiusMeters: number;
  confidence: number; // 0 to 100
  sources: string[];
  limitations?: string[];
  timestamp: string;
  attribution?: string;
  rawMetadata?: Record<string, unknown>;
}

export interface DeviceConsent {
  deviceIdHash: string;
  userId: string;
  deviceAlias?: string;
  consentState: ConsentState;
  grantedAt: string;
  revokedAt?: string;
  collectionTypes: string[]; // e.g. ['CELL', 'WIFI', 'GPS']
  retentionDays: number;
}

export interface OperatorInfo {
  mcc: number;
  mnc: number;
  name: string;
  country: string;
  countryCode: string;
  radioTypes: RadioType[];
  source: string;
}

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  postcode?: string;
  attribution: string;
}

export interface CellLookupQuery {
  mcc: number;
  mnc: number;
  lac: number;
  cellId: number;
  radio?: RadioType;
}

export interface AreaSearchQuery {
  bbox: BoundingBox;
  mcc?: number;
  mnc?: number;
  lac?: number;
  radio?: RadioType;
  limit?: number;
  offset?: number;
}
