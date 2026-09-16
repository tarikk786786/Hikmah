import os from 'os';
import { UniversalSkillManifest, SkillCompatibilityReport, SkillCompatibilityStatus, SkillDependencyItem } from '../manifests/types.js';

export class SkillCompatibilityEngine {
  private static instance: SkillCompatibilityEngine;

  public static getInstance(): SkillCompatibilityEngine {
    if (!SkillCompatibilityEngine.instance) {
      SkillCompatibilityEngine.instance = new SkillCompatibilityEngine();
    }
    return SkillCompatibilityEngine.instance;
  }

  public evaluateCompatibility(
    manifest: UniversalSkillManifest,
    systemContext?: {
      hasGpu?: boolean;
      vramGb?: number;
      installedPackages?: string[];
      availableCredentials?: string[];
    }
  ): SkillCompatibilityReport {
    const issues: string[] = [];
    const missingDependencies: SkillDependencyItem[] = [];
    const missingHardware: string[] = [];

    const currentPlatform = process.platform as 'win32' | 'linux' | 'darwin';
    const currentArch = process.arch as 'x64' | 'arm64';

    // 1. Platform Check
    const allowedPlatforms = manifest.compatibility.platforms;
    const platformMatch = allowedPlatforms.includes('any') || allowedPlatforms.includes(currentPlatform);
    if (!platformMatch) {
      issues.push(`Platform mismatch: skill requires [${allowedPlatforms.join(', ')}], current OS is '${currentPlatform}'`);
    }

    // 2. Architecture Check
    const allowedArchs = manifest.compatibility.architectures;
    const archMatch = allowedArchs.includes('any') || allowedArchs.includes(currentArch);
    if (!archMatch) {
      issues.push(`Architecture mismatch: skill requires [${allowedArchs.join(', ')}], current CPU arch is '${currentArch}'`);
    }

    // 3. Hardware Requirements Check
    const hw = manifest.hardware;
    const sysGpu = systemContext?.hasGpu ?? (process.env.CUDA_VISIBLE_DEVICES !== undefined || process.env.ENABLE_GPU === 'true');
    const sysVram = systemContext?.vramGb ?? (sysGpu ? 8 : 0);

    if (hw.gpu && !sysGpu) {
      missingHardware.push('Dedicated GPU required but none detected in system environment');
      issues.push('GPU required but system is CPU-only');
    }

    if (hw.minVramGb && sysVram < hw.minVramGb) {
      missingHardware.push(`Requires at least ${hw.minVramGb}GB VRAM (detected ${sysVram}GB)`);
      issues.push(`Insufficient VRAM: requires ${hw.minVramGb}GB`);
    }

    const cpuCores = os.cpus().length;
    if (hw.minCores && cpuCores < hw.minCores) {
      missingHardware.push(`Requires at least ${hw.minCores} CPU cores (detected ${cpuCores})`);
    }

    // 4. Credentials Requirements Check
    let credentialsMissing = false;
    if (manifest.permissions.credentials.required) {
      const availCreds = systemContext?.availableCredentials || Object.keys(process.env);
      for (const provider of manifest.permissions.credentials.providers) {
        const found = availCreds.some(k => k.toLowerCase().includes(provider.toLowerCase()));
        if (!found) {
          credentialsMissing = true;
          issues.push(`Required credential for provider '${provider}' is not configured`);
        }
      }
    }

    // 5. Dependencies Check
    const installed = new Set(systemContext?.installedPackages || []);
    for (const pkg of manifest.dependencies.packages) {
      if (!pkg.optional && !installed.has(pkg.name)) {
        missingDependencies.push(pkg);
      }
    }

    // 6. Determine Aggregate Status
    let status: SkillCompatibilityStatus = 'COMPATIBLE';

    if (!platformMatch || !archMatch) {
      status = 'INCOMPATIBLE';
    } else if (missingHardware.length > 0) {
      status = 'NEEDS_HARDWARE';
    } else if (credentialsMissing) {
      status = 'NEEDS_CREDENTIAL';
    } else if (missingDependencies.length > 0) {
      status = 'NEEDS_DEPENDENCY';
    } else if (issues.length > 0) {
      status = 'PARTIALLY_COMPATIBLE';
    }

    return {
      skillId: manifest.id,
      status,
      compatible: status === 'COMPATIBLE' || status === 'PARTIALLY_COMPATIBLE',
      issues,
      missingDependencies,
      missingHardware,
      platformMatch,
      archMatch,
    };
  }
}
