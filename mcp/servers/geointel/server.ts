import { ToolDefinition, ToolResult, ExecutionContext } from '../../../tools/registry/types.js';
import { ToolRegistry } from '../../../tools/registry/registry.js';
import { CapabilityRegistry } from '../../../core/capabilities/registry.js';
import { Capability } from '../../../core/capabilities/types.js';
import { OpenCellIdProvider } from '../../../core/geointel/providers/opencellid.js';
import { IchnaeaProvider } from '../../../core/geointel/providers/ichnaea.js';
import { OSMProvider } from '../../../core/geointel/providers/osm.js';
import { GeolocationEngine } from '../../../core/geointel/engine.js';
import { ConsentManager } from '../../../core/geointel/consent.js';
import { ObservationIngestionPipeline } from '../../../core/geointel/ingestion.js';
import { MovementAnalyzer } from '../../../core/geointel/movement.js';
import { RadioType } from '../../../core/geointel/types.js';

export class GeointelMCPServer {
  private openCellId: OpenCellIdProvider;
  private ichnaea: IchnaeaProvider;
  private osm: OSMProvider;
  private geoEngine: GeolocationEngine;
  private consentManager: ConsentManager;
  private ingestion: ObservationIngestionPipeline;
  private movement: MovementAnalyzer;
  private toolRegistry: ToolRegistry;
  private capabilityRegistry: CapabilityRegistry;

  constructor(
    toolRegistry?: ToolRegistry,
    capabilityRegistry?: CapabilityRegistry,
    openCellId?: OpenCellIdProvider,
    ichnaea?: IchnaeaProvider,
    osm?: OSMProvider,
    consentManager?: ConsentManager,
    ingestion?: ObservationIngestionPipeline
  ) {
    this.toolRegistry = toolRegistry || ToolRegistry.getInstance();
    this.capabilityRegistry = capabilityRegistry || CapabilityRegistry.getInstance();
    this.openCellId = openCellId || new OpenCellIdProvider();
    this.ichnaea = ichnaea || new IchnaeaProvider();
    this.osm = osm || new OSMProvider();
    this.geoEngine = new GeolocationEngine(this.openCellId, this.ichnaea);
    this.consentManager = consentManager || ConsentManager.getInstance();
    this.ingestion = ingestion || new ObservationIngestionPipeline(this.consentManager);
    this.movement = new MovementAnalyzer();

    this.registerAllTools();
  }

  private registerAllTools(): void {
    const tools: ToolDefinition[] = [
      // 1. cell.lookup
      {
        name: 'geointel_cell_lookup',
        version: '1.0.0',
        description: 'Lookup public cell tower information by MCC, MNC, LAC, and Cell ID via OpenCelliD',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            mcc: { type: 'number', description: 'Mobile Country Code (e.g. 310 for USA)' },
            mnc: { type: 'number', description: 'Mobile Network Code (e.g. 410 for AT&T)' },
            lac: { type: 'number', description: 'Location Area Code / TAC' },
            cellId: { type: 'number', description: 'Cell Identifier (CID)' },
            radio: { type: 'string', enum: ['GSM', 'UMTS', 'LTE', 'NR', 'CDMA'] }
          },
          required: ['mcc', 'mnc', 'lac', 'cellId']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const cell = await this.openCellId.getCellPosition({
            mcc: Number(input.mcc),
            mnc: Number(input.mnc),
            lac: Number(input.lac),
            cellId: Number(input.cellId),
            radio: input.radio as RadioType
          });
          return {
            success: true,
            data: cell,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 2. cell.search_area
      {
        name: 'geointel_cell_search_area',
        version: '1.0.0',
        description: 'Search for public cellular towers within a geographic bounding box',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            minLat: { type: 'number' },
            minLon: { type: 'number' },
            maxLat: { type: 'number' },
            maxLon: { type: 'number' },
            radio: { type: 'string' },
            limit: { type: 'number' }
          },
          required: ['minLat', 'minLon', 'maxLat', 'maxLon']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const result = await this.openCellId.getCellsInArea({
            bbox: {
              minLat: Number(input.minLat),
              minLon: Number(input.minLon),
              maxLat: Number(input.maxLat),
              maxLon: Number(input.maxLon)
            },
            radio: input.radio as RadioType,
            limit: Number(input.limit || 50)
          });
          return {
            success: true,
            data: result,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 3. geo.locate_from_cell
      {
        name: 'geointel_locate_from_cell',
        version: '1.0.0',
        description: 'Estimate location from one or more cell observations using multi-source fusion',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            cells: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  mcc: { type: 'number' },
                  mnc: { type: 'number' },
                  lac: { type: 'number' },
                  cellId: { type: 'number' },
                  radio: { type: 'string' },
                  signalStrengthDbm: { type: 'number' }
                },
                required: ['mcc', 'mnc', 'lac', 'cellId', 'radio']
              }
            }
          },
          required: ['cells']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const rawCells = (input.cells as any[]) || [];
          const observations = rawCells.map((c, idx) => ({
            id: `temp_${idx}`,
            userId: 'system',
            deviceIdHash: 'mcp_query',
            timestamp: new Date().toISOString(),
            mcc: Number(c.mcc),
            mnc: Number(c.mnc),
            lac: Number(c.lac),
            cellId: Number(c.cellId),
            radio: (c.radio || 'LTE').toUpperCase() as RadioType,
            signalStrengthDbm: c.signalStrengthDbm ? Number(c.signalStrengthDbm) : undefined,
            source: 'manual' as const,
            fingerprint: `mcp_${c.cellId}`,
            quality: 'VALIDATED' as const
          }));

          const estimate = await this.geoEngine.estimateLocation(observations);
          return {
            success: true,
            data: estimate,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 4. geo.reverse_geocode
      {
        name: 'geointel_reverse_geocode',
        version: '1.0.0',
        description: 'Resolve geographic coordinates to human-readable address via OpenStreetMap',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' }
          },
          required: ['latitude', 'longitude']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const res = await this.osm.reverseGeocode(
            Number(input.latitude),
            Number(input.longitude)
          );
          return {
            success: true,
            data: res,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 5. device.observation_history
      {
        name: 'geointel_device_history',
        version: '1.0.0',
        description: 'Retrieve chronological telemetry and cell transitions for an authorized device',
        risk: 'MEDIUM',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            deviceIdHash: { type: 'string', description: 'SHA-256 hash of authorized device identity' }
          },
          required: ['deviceIdHash']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const hash = String(input.deviceIdHash);

          if (!this.consentManager.hasValidConsent(hash)) {
            throw new Error(`Device [${hash.substring(0, 8)}...] does not have active consent granted`);
          }

          const obs = this.ingestion.listObservations(hash);
          const summary = obs.length > 0 ? this.movement.analyze(obs) : null;

          return {
            success: true,
            data: {
              deviceIdHash: hash,
              observations: obs,
              summary
            },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 6. geointel_register_device_consent
      {
        name: 'geointel_register_device_consent',
        version: '1.0.0',
        description: 'Register an authorized device with explicit opt-in consent and salted SHA-256 hash',
        risk: 'MEDIUM',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            deviceIdentifier: { type: 'string', description: 'Raw client device ID (will be hashed with SHA-256)' },
            userId: { type: 'string', description: 'Associated user account ID' },
            deviceAlias: { type: 'string', description: 'Friendly label (e.g. Pixel 7a)' },
            collectionTypes: { type: 'array', items: { type: 'string' } },
            retentionDays: { type: 'number' }
          },
          required: ['deviceIdentifier']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const deviceIdHash = this.consentManager.hashDeviceId(String(input.deviceIdentifier));
          const consent = this.consentManager.grantConsent(
            deviceIdHash,
            String(input.userId || 'usr_default'),
            (input.collectionTypes as string[]) || ['CELL', 'GPS'],
            input.deviceAlias ? String(input.deviceAlias) : undefined,
            input.retentionDays ? Number(input.retentionDays) : 90
          );
          return {
            success: true,
            data: { deviceIdHash, consent },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 7. geointel_revoke_device_consent
      {
        name: 'geointel_revoke_device_consent',
        version: '1.0.0',
        description: 'Immediately revoke consent for an authorized device, halting ingestion',
        risk: 'MEDIUM',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            deviceIdHash: { type: 'string' },
            deviceIdentifier: { type: 'string' }
          }
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const hash = input.deviceIdHash
            ? String(input.deviceIdHash)
            : this.consentManager.hashDeviceId(String(input.deviceIdentifier));
          const revoked = this.consentManager.revokeConsent(hash);
          return {
            success: revoked,
            data: { deviceIdHash: hash, status: 'REVOKED' },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 8. geointel_verify_device_consent
      {
        name: 'geointel_verify_device_consent',
        version: '1.0.0',
        description: 'Verify if a device hash has active GRANTED consent',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            deviceIdHash: { type: 'string' }
          },
          required: ['deviceIdHash']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const hash = String(input.deviceIdHash);
          const hasConsent = this.consentManager.hasValidConsent(hash);
          const consent = this.consentManager.getConsent(hash);
          return {
            success: true,
            data: { deviceIdHash: hash, hasConsent, consent },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 9. geointel_list_consented_devices
      {
        name: 'geointel_list_consented_devices',
        version: '1.0.0',
        description: 'List registered devices and their consent policies',
        risk: 'MEDIUM',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' }
          }
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const list = this.consentManager.listConsents(input.userId ? String(input.userId) : undefined);
          return {
            success: true,
            data: { devices: list },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 10. geointel_purge_device_data
      {
        name: 'geointel_purge_device_data',
        version: '1.0.0',
        description: 'Permanently delete all historical telemetry observations for an authorized device',
        risk: 'HIGH',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            deviceIdHash: { type: 'string' }
          },
          required: ['deviceIdHash']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const hash = String(input.deviceIdHash);
          const deletedCount = this.ingestion.purgeDeviceData(hash);
          return {
            success: true,
            data: { deviceIdHash: hash, deletedCount, message: `Purged ${deletedCount} observations` },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 11. geointel_ingest_observations
      {
        name: 'geointel_ingest_observations',
        version: '1.0.0',
        description: 'Ingest batch RF telemetry observations from an authorized device',
        risk: 'MEDIUM',
        timeoutMs: 20000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            deviceIdHash: { type: 'string' },
            observations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  mcc: { type: 'number' },
                  mnc: { type: 'number' },
                  lac: { type: 'number' },
                  cellId: { type: 'number' },
                  radio: { type: 'string' },
                  signalStrengthDbm: { type: 'number' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  accuracy: { type: 'number' },
                  timestamp: { type: 'string' }
                },
                required: ['mcc', 'mnc', 'lac', 'cellId', 'radio']
              }
            }
          },
          required: ['deviceIdHash', 'observations']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const hash = String(input.deviceIdHash);
          const rawObs = (input.observations as any[]) || [];
          let ingestedCount = 0;
          let duplicateCount = 0;

          for (const item of rawObs) {
            const res = await this.ingestion.ingest({
              deviceIdHash: hash,
              mcc: Number(item.mcc),
              mnc: Number(item.mnc),
              lac: Number(item.lac),
              cellId: Number(item.cellId),
              radio: (item.radio || 'LTE').toUpperCase() as RadioType,
              signalStrengthDbm: item.signalStrengthDbm ? Number(item.signalStrengthDbm) : undefined,
              latitude: item.latitude !== undefined ? Number(item.latitude) : undefined,
              longitude: item.longitude !== undefined ? Number(item.longitude) : undefined,
              accuracy: item.accuracy !== undefined ? Number(item.accuracy) : undefined,
              timestamp: item.timestamp
            });

            if (res.isDuplicate) {
              duplicateCount++;
            } else {
              ingestedCount++;
            }
          }

          return {
            success: true,
            data: { ingestedCount, duplicateCount, total: rawObs.length },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 12. geointel_analyze_movement
      {
        name: 'geointel_analyze_movement',
        version: '1.0.0',
        description: 'Analyze mobility patterns, cell handovers, distance, and signal reception',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            deviceIdHash: { type: 'string' }
          }
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const hash = input.deviceIdHash ? String(input.deviceIdHash) : undefined;
          const obs = hash ? this.ingestion.listObservations(hash) : [];
          const summary = obs.length > 0 ? this.movement.analyze(obs) : null;
          return {
            success: true,
            data: { summary, observationCount: obs.length },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 13. geointel_check_provider_quota
      {
        name: 'geointel_check_provider_quota',
        version: '1.0.0',
        description: 'Check daily remaining credits and request limits for external providers',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            provider: { type: 'string', enum: ['opencellid', 'ichnaea', 'osm'] }
          }
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const p = (input.provider as string) || 'opencellid';
          const tracker = (await import('../../../core/geointel/quota-tracker.js')).QuotaTracker.getInstance();
          const remaining = tracker.getRemaining(p);
          const limit = tracker.getLimit(p);
          const used = tracker.getDailyCount(p);
          return {
            success: true,
            data: { provider: p, remaining, used, limit },
            executionTimeMs: Date.now() - start
          };
        }
      }
    ];


    for (const tool of tools) {
      this.toolRegistry.registerTool(tool);

      // Also register as first-class Capability in CapabilityRegistry
      const cap: Capability = {
        id: `cap_geointel_${tool.name.replace('geointel_', '')}`,
        name: `Cellular Geointel: ${tool.name}`,
        version: '1.0.0',
        category: 'OSINT',
        description: tool.description,
        provider: 'hikmah-geointel',
        type: 'TOOL',
        input_schema: tool.inputSchema,
        output_schema: tool.outputSchema,
        permissions: ['NETWORK_ACCESS'],
        risk_level: tool.risk,
        runtime: 'VERCEL',
        supported_environments: ['node'],
        timeout: tool.timeoutMs,
        retry_policy: { maxRetries: 2, backoffMs: 1000 },
        enabled: true,
        health_status: 'HEALTHY',
        tags: ['geointel', 'cellular', 'mcp', 'location']
      };

      this.capabilityRegistry.register(cap);
    }
  }
}
