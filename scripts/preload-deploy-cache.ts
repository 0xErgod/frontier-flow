import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";

import type { BundledDependencySnapshot, ResolvedDependencies } from "../src/compiler/types";
import { loadMoveBuilderLite, moveBuilderLiteWasmUrl, verifyMoveBuilderLiteIntegrity } from "../src/compiler/moveBuilderLite";
import { canonicalizeResolvedDependencies, createSnapshotValidationResult } from "../src/deployment/dependencySnapshotValidation";

export interface CacheSnapshotConfig {
  readonly sourceVersionTag: string;
  readonly repositoryUrl: string;
  readonly subdirectory: string;
  readonly outputPath: string;
  readonly targets: readonly string[];
}

interface CacheManifest {
  readonly snapshots: readonly CacheSnapshotConfig[];
}

function parseManifest(value: unknown): CacheManifest {
  if (typeof value !== "object" || value === null || !Array.isArray((value as CacheManifest).snapshots)) {
    throw new Error("Deploy cache manifest must include a snapshots array.");
  }

  const snapshots = (value as CacheManifest).snapshots.map((snapshot) => {
    if (
      typeof snapshot !== "object"
      || snapshot === null
      || typeof snapshot.sourceVersionTag !== "string"
      || typeof snapshot.repositoryUrl !== "string"
      || typeof snapshot.subdirectory !== "string"
      || typeof snapshot.outputPath !== "string"
      || !Array.isArray(snapshot.targets)
      || !snapshot.targets.every((target) => typeof target === "string")
    ) {
      throw new Error("Each deploy cache snapshot entry must define sourceVersionTag, repositoryUrl, subdirectory, outputPath, and targets.");
    }

    return snapshot;
  });

  return { snapshots };
}

function createBundledSnapshot(
  sourceVersionTag: string,
  resolvedDependencies: ResolvedDependencies,
): BundledDependencySnapshot {
  const canonicalResolvedDependencies = canonicalizeResolvedDependencies(resolvedDependencies);
  const validation = createSnapshotValidationResult(canonicalResolvedDependencies);
  if (!validation.isValid) {
    throw new Error(`Bundled snapshot validation failed for ${sourceVersionTag}: ${validation.message}`);
  }

  const bundledSnapshot: BundledDependencySnapshot = {
    sourceVersionTag,
    resolvedAt: Date.now(),
    resolvedDependencies: {
      files: "{}",
      dependencies: canonicalResolvedDependencies.dependencies,
      lockfileDependencies: canonicalResolvedDependencies.lockfileDependencies,
    },
  };

  return bundledSnapshot;
}

/**
 * Build the throwaway root package used only to resolve the pinned world
 * dependency. `world` is the dependency name, so it must not also be declared
 * as a named address: Move.lock V4 rejects that as a duplicate.
 */
export function createSyntheticFiles(sourceVersionTag: string, repositoryUrl: string, subdirectory: string): Record<string, string> {
  return {
    "Move.toml": [
      "[package]",
      'name = "starter_contract"',
      'edition = "2024.beta"',
      "",
      "[dependencies]",
      `world = { git = "${repositoryUrl}", rev = "${sourceVersionTag}", subdir = "${subdirectory}" }`,
      "",
      "[addresses]",
      'builder_extensions = "0x0"',
      'starter_contract = "0x0"',
      "",
    ].join("\n"),
    "sources/starter_contract.move": "module builder_extensions::starter_contract {}\n",
  };
}

/**
 * Resolution request for one snapshot entry.
 *
 * The synthetic root package is local, so it must not be described with
 * `rootGit`. Declaring it as the same git/rev/subdir triple that the `world`
 * dependency points at makes the root its own dependency, which the resolver
 * reports as `Dependency cycle detected: starter_contract -> starter_contract`.
 */
export function createDependencyResolutionRequest(snapshot: CacheSnapshotConfig): {
  readonly files: Record<string, string>;
  readonly wasm: string;
  readonly network: "testnet";
  readonly silenceWarnings: boolean;
} {
  return {
    files: createSyntheticFiles(snapshot.sourceVersionTag, snapshot.repositoryUrl, snapshot.subdirectory),
    wasm: moveBuilderLiteWasmUrl,
    network: "testnet",
    silenceWarnings: false,
  };
}

async function loadManifest(manifestPath: string): Promise<CacheManifest> {
  const raw = await readFile(manifestPath, "utf8");
  return parseManifest(JSON.parse(raw) as unknown);
}

async function main(): Promise<void> {
  const manifestPath = resolvePath(process.cwd(), process.argv[2] ?? "scripts/deploy-cache-packages.json");
  const manifest = await loadManifest(manifestPath);
  const compilerModule = await loadMoveBuilderLite();

  await verifyMoveBuilderLiteIntegrity();
  await compilerModule.initMovePackageBuilder({ wasm: moveBuilderLiteWasmUrl });

  for (const snapshot of manifest.snapshots) {
    const resolvedDependencies = await compilerModule.resolveMovePackageDependencies(
      createDependencyResolutionRequest(snapshot),
    );

    const output = createBundledSnapshot(snapshot.sourceVersionTag, resolvedDependencies);

    const outputPath = resolvePath(process.cwd(), snapshot.outputPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

    console.log(`Pre-cached ${snapshot.sourceVersionTag} for ${snapshot.targets.join(", ")} -> ${snapshot.outputPath}`);
  }
}

// Run CLI if this is the main module
if (import.meta.main) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}